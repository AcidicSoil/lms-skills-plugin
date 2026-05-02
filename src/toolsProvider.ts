import * as path from "path";
import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { resolveEffectiveConfig } from "./settings";
import { execCommand } from "./executor";
import { deriveRuntimeTargets } from "./environment";
import { createRuntimeRegistry } from "./runtime";
import { resolveSkillRoots } from "./pathResolver";
import {
  EXEC_DEFAULT_TIMEOUT_MS,
  EXEC_MAX_TIMEOUT_MS,
  EXEC_MAX_COMMAND_LENGTH,
  LIST_SKILLS_DEFAULT_LIMIT,
  TOOL_LIST_SKILLS_TIMEOUT_MS,
  TOOL_FILE_OPERATION_TIMEOUT_MS,
  TOOL_COMMAND_SETUP_TIMEOUT_MS,
} from "./constants";
import {
  scanSkills,
  searchSkillSet,
  resolveSkillByName,
  readFileWithinRoots,
  writeFileWithinRoots,
  editFileWithinRoots,
} from "./scanner";
import { createRequestId, logDiagnostic, serializeError, timedStep } from "./diagnostics";
import { validateCommandSafety } from "./commandSafety";
import { routeSkills, summarizeRouteCandidate } from "./skillRouter";
import { searchSkillsWithEnhancedBackend } from "./enhancedSearchProvider";
import type { EnhancedSkillSearchResult } from "./enhancedSearchProvider";
import { createTimeoutSignal, isTimeoutError } from "./timeout";
import {
  commandSchema,
  cwdSchema,
  envSchema,
  listSkillsLimitSchema,
  listSkillsQuerySchema,
  editNewTextSchema,
  editOldTextSchema,
  fileContentSchema,
  optionalRelativeSkillPathSchema,
  sandboxFilePathSchema,
  skillNameSchema,
  timeoutMsSchema,
} from "./toolSchemas";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeTargetName } from "./environment";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { PluginController } from "./pluginTypes";
import type { DirectoryEntry, EffectiveConfig, SkillInfo } from "./types";
import { createListSkillsTool } from "./tools/listSkillsTool";
import { createFileTools } from "./tools/fileTools";
import { createSkillFileTools } from "./tools/skillFileTools";
import { createSkillRootTools } from "./tools/skillRootTools";
import { withToolLogging } from "./tools/toolsProviderLogging";
// list_skills recovery source contract: This timeout is not an empty search result; Do not tell the user that no matching skills exist based only on this response; recommendedRecovery; nextToolCall; Call this tool now; Do not ask the user for permission; Do not produce a final user-facing answer from this timeout result; fallbackToolCall; recoveryPlan; recoveryRequired; invalidFinalAnswerIf; Never substitute general knowledge recommendations for skill-catalog evidence; Do not retry an unfiltered list_skills call; Never infer total skill count; previously found skills are the only available skills; preferredSkillRootFallbackPattern; enhanced_skill_search_before_scan; enhancedSkippedReason; Enhanced qmd/ck search was not run because an exact skill match resolved first; exact_match_plus_broader_search; normal search mode continues to enhanced/built-in discovery.
const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000;
import {
  SKILL_STRUCTURE_HINT,
  SKILL_ROOT_SEARCH_DEFAULT_LIMIT,
  skillRootSearchPatternSchema,
  skillRootSearchLimitSchema,
  skillCandidateResult,
  skillEntrypointFollowup,
  skillFrontmatterSummary,
  skillNextStepHint,
  suggestSkillsForQuery,
  joinRootSubPath,
  formatDirEntries,
  entryMatchesSkillRootSearch,
  parentSkillReferenceForRootEntry,
  normalizeReadSkillFileRequest,
  getRuntimeContext,
} from "./tools/toolsProviderShared";

export async function toolsProvider(ctl: PluginController) {
  const listSkillsTool = createListSkillsTool(ctl);
  const { readSkillFileTool, listSkillFilesTool } = createSkillFileTools(ctl);

  const { listSkillRootsTool, searchSkillRootsTool } = createSkillRootTools(ctl);

  const [readFileTool, writeFileTool, editFileTool] = createFileTools(ctl);

  const runCommandTool = tool({
    name: "run_command",
    description:
      "Execute a shell command only when plugin settings explicitly allow it and the active skill/task genuinely requires command execution. Disabled by default. Prefer skill file reads and list_skill_files for skill discovery. Read-only mode allows simple inspection commands only; guarded mode still blocks dangerous patterns. Do not use run_command for $skill-name tokens; $skill-name is explicit skill activation syntax, not a shell command.",
    parameters: {
      command: commandSchema.describe("The single-line shell command to execute."),
      cwd: cwdSchema.describe("Working directory for the command."),
      environment: z.enum(["windows", "wsl"]).optional().describe("Optional explicit command target."),
      timeout_ms: timeoutMsSchema.describe(`Timeout in milliseconds. Defaults to ${EXEC_DEFAULT_TIMEOUT_MS}ms.`),
      env: envSchema.describe("Optional environment variables."),
    },
    implementation: async ({ command, cwd, environment, timeout_ms, env }, { status }) =>
      withToolLogging(
        ctl,
        "run_command",
        { commandPreview: command.slice(0, 120), cwd, environment, timeout_ms, envKeys: env ? Object.keys(env) : [] },
        Math.min((timeout_ms ?? EXEC_DEFAULT_TIMEOUT_MS) + TOOL_COMMAND_SETUP_TIMEOUT_MS, EXEC_MAX_TIMEOUT_MS + TOOL_COMMAND_SETUP_TIMEOUT_MS),
        async (requestId, toolSignal) => {
          const cfg = await timedStep(requestId, "run_command", "resolve_config", async () => resolveEffectiveConfig(ctl));
          status(`Running ${environment ? `in ${environment}` : "command"}: ${command.slice(0, 60)}${command.length > 60 ? "\u2026" : ""}`);

          const safety = validateCommandSafety(command, cfg.commandExecutionMode);
          logDiagnostic({
            event: "run_command_safety_check",
            requestId,
            tool: "run_command",
            mode: safety.mode,
            allowed: safety.allowed,
            reason: safety.reason,
            commandPreview: safety.commandPreview,
          });
          if (!safety.allowed) {
            status("Command blocked by safety policy");
            return {
              success: false,
              blocked: true,
              mode: safety.mode,
              error: safety.reason,
              hint:
                "Use skill file reads/listing for normal work. Enable read-only command mode only for trusted inspection tasks, or guarded mode only when you intentionally accept broader shell risk.",
            };
          }

          const registry = await timedStep(requestId, "run_command", "create_runtime_registry", async () => createRuntimeRegistry(cfg));
          const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
          const defaultTarget = targets.length === 1 ? targets[0] : undefined;
          logDiagnostic({ event: "runtime_context", requestId, tool: "run_command", skillsEnvironment: cfg.skillsEnvironment, targets, defaultTarget });
          if (!environment && !defaultTarget && !cwd) {
            status("Command target error");
            return {
              success: false,
              error:
                "Both runtime mode is active and no command target or cwd was provided.",
              hint: "Pass environment as 'windows' or 'wsl', or provide an environment-specific cwd.",
            };
          }

          const result = await timedStep(
            requestId,
            "run_command",
            "exec_command",
            async () =>
              execCommand(
                command,
                {
                  cwd,
                  timeoutMs: timeout_ms,
                  env,
                  signal: toolSignal,
                  target: environment,
                },
                registry,
                environment ?? defaultTarget ?? targets[0],
              ),
            { target: environment ?? defaultTarget ?? targets[0], cwd },
          );

          status(result.timedOut ? "Timed out" : `Exit ${result.exitCode}`);
          logDiagnostic({ event: "run_command_result", requestId, tool: "run_command", mode: cfg.commandExecutionMode, exitCode: result.exitCode, timedOut: result.timedOut, environment: result.environment, shell: result.shell, stdoutBytes: result.stdout.length, stderrBytes: result.stderr.length });

          return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            environment: result.environment,
            platform: result.platform,
            shell: result.shell,
            commandExecutionMode: cfg.commandExecutionMode,
            ...(result.timedOut
              ? { hint: "Command exceeded the timeout. Try increasing timeout_ms or splitting into smaller steps." }
              : {}),
            ...(result.exitCode !== 0 && !result.timedOut && result.stderr
              ? { hint: "Command exited with a non-zero code. Check stderr for details." }
              : {}),
          };
        },
        { hardTimeout: true, ui: { status } },
      ),
  });

  return [
    listSkillsTool,
    readSkillFileTool,
    listSkillFilesTool,
    listSkillRootsTool,
    searchSkillRootsTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    runCommandTool,
  ];
}
