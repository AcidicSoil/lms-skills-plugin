import type { PluginController } from "./pluginTypes";
import { createRequestId, logDiagnostic, serializeError } from "./diagnostics";
import { createTimeoutSignal, isTimeoutError } from "./timeout";
import { compactToolStatusValue, emitToolDebugStatus, emitToolDebugWarning, preferredSkillRootFallbackPattern, type ToolUiReporter } from "./toolsProviderShared";

const TOOL_VISIBLE_STILL_WORKING_MS = 5_000;

function toolRecoveryResult<T>(toolName: string, args: Record<string, unknown>, elapsedMs: number, recoveryTimeoutMs: number): T {
  if (toolName === "list_skills") {
    const query = typeof args.query === "string" ? args.query.trim() : "";
    const mode = typeof args.mode === "string" ? args.mode : undefined;
    const recommendedParameters = query
      ? { query, limit: 10 }
      : undefined;
    const fallbackPattern = query
      ? preferredSkillRootFallbackPattern(query)
      : "SKILL.md";
    const retryListSkillsCall = query
      ? {
          tool: "list_skills",
          parameters: recommendedParameters,
          required: false,
          instruction: "Optional only after root search: retry a smaller query search if root search does not provide enough evidence.",
        }
      : undefined;
    const nextToolCall = {
      tool: "search_skill_roots",
      parameters: { pattern: fallbackPattern, limit: 50 },
      required: true,
      instruction: query
        ? "Call this tool now for the same timed-out subtask. Do not switch to another user subtask. Do not ask the user for permission and do not produce a final answer from this timeout result."
        : "Call this tool now to inspect SKILL.md entrypoints. Do not retry an unfiltered list_skills call, do not ask the user for permission, and do not infer the total skill count from this timeout.",
    };
    const fallbackToolCall = retryListSkillsCall ?? {
      tool: "list_skill_roots",
      parameters: { sub_path: fallbackPattern },
      required: false,
      instruction: "Use this only if root search fails; inspect nearby tree structure before answering.",
    };
    const recoveryPlan = query
      ? [
          nextToolCall,
          ...(retryListSkillsCall ? [retryListSkillsCall] : []),
          {
            tool: "list_skill_roots",
            parameters: { sub_path: fallbackPattern },
            required: false,
            instruction: "Use this only if root search and optional query retry fail; inspect nearby tree structure before answering.",
          },
        ]
      : [nextToolCall];
    return {
      success: false,
      timedOut: true,
      recovered: true,
      tool: toolName,
      elapsedMs,
      timeoutMs: recoveryTimeoutMs,
      query: query || undefined,
      mode,
      found: null,
      skills: undefined,
      error: `${toolName} did not return within ${recoveryTimeoutMs}ms.`,
      note: "This timeout is not an empty search result. Do not tell the user that no matching skills exist based only on this response, and do not ask whether to continue before trying the provided recoveryPlan.",
      hint: query
        ? "Immediately execute recoveryPlan starting with search_skill_roots for this same timed-out subtask until one call returns candidates or root evidence. Do not switch to another subtask first. A final answer based only on this timeout is invalid."
        : "Immediately call nextToolCall to inspect SKILL.md entrypoints. Do not retry the same unfiltered list_skills call and do not infer that previously found skills are the only available skills.",
      recommendedRecovery: query
        ? {
            tool: "search_skill_roots",
            parameters: { pattern: fallbackPattern, limit: 50 },
            reason: "The query search timed out. Inspect root paths for the same subtask before retrying list_skills or moving to another user subtask.",
          }
        : {
            tool: "search_skill_roots",
            parameters: { pattern: fallbackPattern, limit: 50 },
            reason: "An unfiltered skill listing timed out. Inspect SKILL.md entrypoints instead of retrying the same broad list or inferring the total catalog size.",
          },
      nextToolCall,
      fallbackToolCall,
      recoveryPlan,
      recoveryRequired: true,
      invalidFinalAnswerIf: "The answer is based only on this timeout/recovery payload and recoveryPlan was not attempted for the same timed-out subtask. Do not answer from general knowledge about prompt engineering, agents, frameworks, or concepts, and do not switch to another user subtask until same-subtask skill recovery has been attempted.",
      fallbackTools: ["search_skill_roots", "list_skill_roots"],
      finalAnswerGuidance: "Do not produce a final user-facing answer from this timeout result. Continue with recoveryPlan first. Never infer total skill count or say previously found skills are the only available skills from a timeout. Never substitute general knowledge recommendations for skill-catalog evidence. Only say no matching skill exists after a non-timeout result returns found=0 and root inspection finds no relevant SKILL.md entrypoint.",
    } as T;
  }

  return {
    success: false,
    timedOut: true,
    recovered: true,
    tool: toolName,
    elapsedMs,
    error: `${toolName} did not return within ${recoveryTimeoutMs}ms.`,
    hint:
      "The tool is still bounded for model usability. Try an exact skill name, use mode='route' with a concise query, reduce skill roots, check external search backend settings, or inspect plugin diagnostics.",
  } as T;
}

export async function withToolLogging<T>(
  ctl: PluginController,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs: number,
  fn: (requestId: string, signal: AbortSignal) => Promise<T>,
  options: { hardTimeout?: boolean; recoveryTimeoutMs?: number; ui?: ToolUiReporter } = {},
): Promise<T> {
  const requestId = createRequestId(toolName);
  const startedAt = Date.now();
  const hardTimeout = options.hardTimeout === true;
  const timeout = hardTimeout
    ? createTimeoutSignal(
        ctl.abortSignal,
        timeoutMs,
        `${toolName} tool request`,
      )
    : undefined;
  const fallbackController = new AbortController();
  const forwardParentAbort = () => fallbackController.abort(ctl.abortSignal?.reason);
  if (ctl.abortSignal?.aborted) forwardParentAbort();
  else ctl.abortSignal?.addEventListener("abort", forwardParentAbort, { once: true });
  const signal = timeout?.signal ?? fallbackController.signal;
  const visibleStillWorkingTimer = setTimeout(() => {
    emitToolDebugWarning(options.ui, `${toolName}: still working`, {
      requestId,
      elapsedMs: Date.now() - startedAt,
      note: "current stage may be filesystem or backend search",
    });
  }, Math.min(TOOL_VISIBLE_STILL_WORKING_MS, Math.max(1_000, timeoutMs)));

  const slowTimer = hardTimeout
    ? undefined
    : setTimeout(() => {
        logDiagnostic({
          event: "tool_slow",
          requestId,
          tool: toolName,
          elapsedMs: Date.now() - startedAt,
          softTimeoutMs: timeoutMs,
          note: "Soft watchdog elapsed; tool continues unless the chat/request itself is aborted.",
        });
        emitToolDebugWarning(options.ui, `${toolName}: still running`, {
          requestId,
          elapsedMs: Date.now() - startedAt,
          softTimeoutMs: timeoutMs,
        });
      }, timeoutMs);

  let recoveryTimerHandle: ReturnType<typeof setTimeout> | undefined;
  const recoveryTimer =
    !hardTimeout && options.recoveryTimeoutMs
      ? new Promise<T>((resolve) => {
          recoveryTimerHandle = setTimeout(() => {
            logDiagnostic({
              event: "tool_recovery_timeout",
              requestId,
              tool: toolName,
              elapsedMs: Date.now() - startedAt,
              recoveryTimeoutMs: options.recoveryTimeoutMs,
              note: "Returning a bounded recovery result so the model can continue debugging instead of waiting indefinitely.",
            });
            const error = new Error(`${toolName} recovery timeout after ${options.recoveryTimeoutMs}ms.`);
            error.name = "TimeoutError";
            fallbackController.abort(error);
            emitToolDebugWarning(options.ui, `${toolName}: recovery timeout`, {
              requestId,
              elapsedMs: Date.now() - startedAt,
              recoveryTimeoutMs: options.recoveryTimeoutMs,
            });
            resolve(toolRecoveryResult<T>(
              toolName,
              args,
              Date.now() - startedAt,
              options.recoveryTimeoutMs ?? 0,
            ));
          }, options.recoveryTimeoutMs);
        })
      : undefined;

  logDiagnostic({ event: "tool_start", requestId, tool: toolName, timeoutMs, hardTimeout, recoveryTimeoutMs: options.recoveryTimeoutMs, args });
  emitToolDebugStatus(options.ui, `${toolName}: started`, {
    requestId,
    timeoutMs,
    hardTimeout,
    args: compactToolStatusValue(args),
  });
  try {
    const work = fn(requestId, signal);
    const result = recoveryTimer ? await Promise.race([work, recoveryTimer]) : await work;
    const elapsedMs = Date.now() - startedAt;
    logDiagnostic({
      event: "tool_complete",
      requestId,
      tool: toolName,
      elapsedMs,
      timeoutMs,
      hardTimeout,
    });
    emitToolDebugStatus(options.ui, `${toolName}: completed`, { requestId, elapsedMs });
    return result;
  } catch (error) {
    const timedOut = isTimeoutError(error);
    const elapsedMs = Date.now() - startedAt;
    logDiagnostic({
      event: timedOut ? "tool_timeout" : "tool_error",
      requestId,
      tool: toolName,
      elapsedMs,
      timeoutMs,
      hardTimeout,
      error: serializeError(error),
    });
    emitToolDebugWarning(options.ui, timedOut ? `${toolName}: timed out` : `${toolName}: failed`, {
      requestId,
      elapsedMs,
      error: error instanceof Error ? error.message : String(error),
    });
    if (timedOut) {
      return {
        success: false,
        timedOut: true,
        error: error instanceof Error ? error.message : `${toolName} timed out.`,
        hint: "This hard timeout is only used for bounded command execution. Try increasing timeout_ms or splitting the command into smaller steps.",
      } as T;
    }
    throw error;
  } finally {
    clearTimeout(visibleStillWorkingTimer);
    if (slowTimer) clearTimeout(slowTimer);
    if (recoveryTimerHandle) clearTimeout(recoveryTimerHandle);
    ctl.abortSignal?.removeEventListener("abort", forwardParentAbort);
    timeout?.cleanup();
  }
}
