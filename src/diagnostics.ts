let nextRequestId = 0;

const DEBUG_LOGGING = /^(1|true|yes|debug)$/i.test(
  process.env.LMS_SKILLS_DEBUG ?? "",
);
const SLOW_STEP_MS = Number(process.env.LMS_SKILLS_SLOW_STEP_MS ?? 250);
const SLOW_RUNTIME_MS = Number(process.env.LMS_SKILLS_SLOW_RUNTIME_MS ?? 500);

export interface DiagnosticEvent {
  event: string;
  requestId?: string;
  tool?: string;
  step?: string;
  elapsedMs?: number;
  level?: "debug" | "info" | "warn" | "error";
  [key: string]: unknown;
}

export function createRequestId(prefix = "req"): string {
  nextRequestId = (nextRequestId + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now().toString(36)}-${nextRequestId.toString(36)}`;
}

function shouldLog(event: DiagnosticEvent): boolean {
  if (DEBUG_LOGGING) return true;

  switch (event.event) {
    case "prompt_context":
    case "prompt_route":
    case "preprocess_decision":
    case "preprocess_activation":
    case "preprocess_fallback":
    case "tool_start":
    case "tool_complete":
    case "tool_error":
    case "tool_timeout":
    case "step_error":
    case "skill_not_found":
    case "skill_resolved":
    case "read_skill_file_result":
    case "list_skills_exact_result":
    case "list_skills_result":
    case "list_skills_route_result":
    case "list_skill_files_result":
    case "run_command_safety_check":
    case "run_command_result":
    case "runtime_exec_error":
    case "runtime_exec_abort":
    case "runtime_exec_spawn_error":
      return true;
    case "step_complete":
      return typeof event.elapsedMs === "number" && event.elapsedMs >= SLOW_STEP_MS;
    case "runtime_exec_complete":
      return (
        event.timedOut === true ||
        event.exitCode !== 0 ||
        (typeof event.elapsedMs === "number" && event.elapsedMs >= SLOW_RUNTIME_MS)
      );
    default:
      return false;
  }
}

function compactEvent(event: DiagnosticEvent): DiagnosticEvent {
  const compact: DiagnosticEvent = {
    ts: new Date().toISOString(),
    plugin: "lms-skills",
    level: event.level ?? inferLevel(event),
    ...event,
  };

  if (!DEBUG_LOGGING) {
    delete compact.stack;
    if (compact.error && typeof compact.error === "object") {
      const error = compact.error as Record<string, unknown>;
      compact.error = {
        name: error.name,
        message: error.message,
      };
    }
  }

  return compact;
}

function inferLevel(event: DiagnosticEvent): "debug" | "info" | "warn" | "error" {
  if (event.event.endsWith("_error") || event.event === "tool_error") return "error";
  if (event.event.includes("abort") || event.event.includes("timeout") || event.timedOut === true) return "warn";
  if (event.event === "step_complete" || event.event.startsWith("runtime_")) {
    return DEBUG_LOGGING ? "debug" : "info";
  }
  return "info";
}

function errorMessage(event: DiagnosticEvent): string {
  const error = event.error as Record<string, unknown> | undefined;
  const message = error?.message ?? event.reason ?? event.error;
  return message ? String(message) : "unknown error";
}

function id(event: DiagnosticEvent): string {
  return event.requestId ? ` id=${event.requestId}` : "";
}

function elapsed(event: DiagnosticEvent): string {
  return typeof event.elapsedMs === "number" ? ` ${event.elapsedMs}ms` : "";
}

function quote(value: unknown): string {
  if (value === undefined || value === null || value === "") return "-";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

function toolArgs(event: DiagnosticEvent): string {
  const args = event.args as Record<string, unknown> | undefined;
  if (!args) return "";
  if (event.tool === "read_skill_file") {
    return ` skill=${quote(args.skill_name)} file=${quote(args.file_path)}`;
  }
  if (event.tool === "list_skill_files") {
    return ` skill=${quote(args.skill_name)} sub=${quote(args.sub_path)}`;
  }
  if (event.tool === "list_skills") {
    return ` query=${quote(args.query)} limit=${quote(args.limit)}`;
  }
  if (event.tool === "run_command") {
    return ` target=${quote(args.environment)} cwd=${quote(args.cwd)} command=${quote(args.commandPreview)}`;
  }
  return "";
}

function formatPromptContext(event: DiagnosticEvent): string {
  const context = quote(event.context);
  const reason = quote(event.reason);
  const skills = Array.isArray(event.skills)
    ? (event.skills.length ? event.skills.join(",") : "-")
    : quote(event.skills);
  const unresolved = Array.isArray(event.unresolved)
    ? (event.unresolved.length ? event.unresolved.join(",") : "-")
    : quote(event.unresolved);
  const action = quote(event.expectedAction);
  const preview = quote(event.inputPreview);
  return `prompt context=${context} reason=${reason} skills=${skills} unresolved=${unresolved} action=${action} input="${preview}"${elapsed(event)}${id(event)}`;
}

function formatHumanEvent(event: DiagnosticEvent): string {
  const prefix = `[lms-skills]`;
  switch (event.event) {
    case "prompt_context":
      return `${prefix} ${formatPromptContext(event)}`;
    case "prompt_route":
      return `${prefix} route mode=${quote(event.mode)} top=${quote(event.topSkill)} score=${quote(event.topScore)} confidence=${quote(event.topConfidence)} selected=${quote(event.selected)} rejectedBest=${quote(event.rejectedBest)} action=${quote(event.expectedAction)} input="${quote(event.inputPreview)}" inject=${quote(event.injectionChars)}ch${elapsed(event)}${id(event)}`;
    case "preprocess_activation":
      return `${prefix} prompt activation tokens=${quote(event.activations)} resolved=${quote(event.resolvedSkills)} unresolved=${quote(event.unresolvedSkills)} action=expanded_before_model${id(event)}`;
    case "preprocess_decision":
      return `${prefix} prompt context=${quote(event.mode)} skills=${quote(event.skillCount)} activations=${quote(event.activations)} resolved=${quote(event.resolvedSkills)} input=${quote(event.messageChars)}ch inject=${quote(event.injectionChars)}ch${elapsed(event)}${id(event)}`;
    case "preprocess_fallback":
      return `${prefix} prompt fallback reason=${quote(event.reason)} activations=${quote(event.activations)}${elapsed(event)}${id(event)}`;
    case "tool_start":
      return `${prefix} ${event.tool} start${toolArgs(event)} timeout=${event.timeoutMs ?? "-"}ms${id(event)}`;
    case "tool_complete":
      return `${prefix} ${event.tool} done${elapsed(event)}${id(event)}`;
    case "tool_timeout":
      return `${prefix} ${event.tool} TIMEOUT${elapsed(event)} timeout=${event.timeoutMs ?? "-"}ms error="${errorMessage(event)}"${id(event)}`;
    case "tool_error":
      return `${prefix} ${event.tool} ERROR${elapsed(event)} error="${errorMessage(event)}"${id(event)}`;
    case "step_error":
      return `${prefix} ${event.tool}.${event.step} ERROR${elapsed(event)} error="${errorMessage(event)}"${id(event)}`;
    case "step_complete":
      return `${prefix} ${event.tool}.${event.step} slow${elapsed(event)}${id(event)}`;
    case "skill_resolved":
      return `${prefix} read_skill_file resolved ${quote(event.requestedSkill)} -> ${quote(event.resolvedSkill)} env=${quote(event.environment)}${id(event)}`;
    case "skill_not_found":
      return `${prefix} ${event.tool} skill not found skill=${quote(event.skill_name)} roots=${quote(event.rootCount)}${id(event)}`;
    case "read_skill_file_result":
      return `${prefix} read_skill_file read skill=${quote(event.skill)} mode=${quote(event.mode)} env=${quote(event.environment)} bytes=${quote(event.contentLength)}${id(event)}`;
    case "list_skills_exact_result":
      return `${prefix} list_skills exact query=${quote(event.query)} -> ${quote(event.skill)} env=${quote(event.environment)}${id(event)}`;
    case "list_skills_result":
      return `${prefix} list_skills result total=${quote(event.total)} returned=${quote(event.returned)}${id(event)}`;
    case "list_skills_route_result":
      return `${prefix} list_skills route query=${quote(event.query)} selected=${quote(event.selected)} rejectedBest=${quote(event.rejectedBest)} total=${quote(event.total)}${id(event)}`;
    case "list_skill_files_result":
      return `${prefix} list_skill_files result skill=${quote(event.skill)} mode=${quote(event.mode)} entries=${quote(event.entryCount)}${id(event)}`;
    case "run_command_safety_check":
      return `${prefix} run_command safety mode=${quote(event.mode)} allowed=${quote(event.allowed)} reason=${quote(event.reason)} command=${quote(event.commandPreview)}${id(event)}`;
    case "run_command_result":
      return `${prefix} run_command result exit=${quote(event.exitCode)} timedOut=${quote(event.timedOut)} env=${quote(event.environment)} stdout=${quote(event.stdoutBytes)}B stderr=${quote(event.stderrBytes)}B${id(event)}`;
    case "runtime_exec_abort":
      return `${prefix} runtime ${quote(event.runtime)} abort${elapsed(event)}${id(event)}`;
    case "runtime_exec_error":
    case "runtime_exec_spawn_error":
      return `${prefix} runtime ${quote(event.runtime)} ERROR${elapsed(event)} error="${errorMessage(event)}"${id(event)}`;
    case "runtime_exec_complete":
      return `${prefix} runtime ${quote(event.runtime)} complete${elapsed(event)} exit=${quote(event.exitCode)} stdout=${quote(event.stdoutBytes)}B stderr=${quote(event.stderrBytes)}B${id(event)}`;
    default:
      return `${prefix} ${event.event}${elapsed(event)}${id(event)}`;
  }
}

export function logDiagnostic(event: DiagnosticEvent): void {
  if (!shouldLog(event)) return;

  const payload = compactEvent(event);
  try {
    if (DEBUG_LOGGING) {
      console.log(`[lms-skills:debug] ${JSON.stringify(payload)}`);
    } else {
      console.log(formatHumanEvent(payload));
    }
  } catch {
    console.log(
      `[lms-skills] ${payload.event}${payload.requestId ? ` id=${payload.requestId}` : ""}`,
    );
  }
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...(DEBUG_LOGGING ? { stack: error.stack } : {}),
    };
  }
  return { message: String(error) };
}

export async function timedStep<T>(
  requestId: string,
  tool: string,
  step: string,
  fn: () => Promise<T>,
  extra: Record<string, unknown> = {},
): Promise<T> {
  const startedAt = Date.now();
  logDiagnostic({ event: "step_start", requestId, tool, step, level: "debug", ...extra });
  try {
    const result = await fn();
    logDiagnostic({
      event: "step_complete",
      requestId,
      tool,
      step,
      elapsedMs: Date.now() - startedAt,
      ...extra,
    });
    return result;
  } catch (error) {
    logDiagnostic({
      event: "step_error",
      requestId,
      tool,
      step,
      elapsedMs: Date.now() - startedAt,
      error: serializeError(error),
      ...extra,
    });
    throw error;
  }
}
