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
  TOOL_READ_SKILL_FILE_TIMEOUT_MS,
  TOOL_LIST_SKILL_FILES_TIMEOUT_MS,
  TOOL_COMMAND_SETUP_TIMEOUT_MS,
} from "./constants";
import {
  scanSkills,
  searchSkills,
  resolveSkillByName,
  readSkillFile,
  readAbsolutePath,
  listSkillDirectory,
  listAbsoluteDirectory,
} from "./scanner";
import { createRequestId, logDiagnostic, serializeError, timedStep } from "./diagnostics";
import { validateCommandSafety } from "./commandSafety";
import { routeSkills, summarizeRouteCandidate } from "./skillRouter";
import { createTimeoutSignal, isTimeoutError } from "./timeout";
import {
  commandSchema,
  cwdSchema,
  envSchema,
  listSkillsLimitSchema,
  listSkillsQuerySchema,
  optionalRelativeSkillPathSchema,
  skillNameSchema,
  timeoutMsSchema,
} from "./toolSchemas";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeTargetName } from "./environment";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { PluginController } from "./pluginTypes";
import type { DirectoryEntry, EffectiveConfig, SkillInfo } from "./types";

function exactSkillQueryCandidates(query: string): string[] {
  const trimmed = query.trim();
  const withoutSigil = trimmed.replace(/^\$+/, "").trim();
  const hyphenated = withoutSigil
    .toLowerCase()
    .split(/[^a-z0-9._-]+/)
    .filter(Boolean)
    .join("-");
  return [...new Set([trimmed, withoutSigil, hyphenated].filter(Boolean))];
}

async function resolveExactSkillQuery(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  signal?: AbortSignal,
): Promise<{ skill: SkillInfo; matchedQuery: string } | null> {
  for (const candidate of exactSkillQueryCandidates(query)) {
    const skill = await resolveSkillByName(roots, registry, candidate, signal);
    if (skill) return { skill, matchedQuery: candidate };
  }
  return null;
}

function formatDirEntries(entries: DirectoryEntry[], rootName: string): string {
  if (entries.length === 0) return "Directory is empty.";

  const lines: string[] = [`${rootName}/`];
  for (const entry of entries) {
    const depth = entry.relativePath.split(/[/\\]/).length - 1;
    const indent = "  ".repeat(depth);
    if (entry.type === "directory") {
      lines.push(`${indent}${entry.name}/`);
    } else {
      const size =
        entry.sizeBytes !== undefined
          ? entry.sizeBytes >= 1024
            ? `${Math.round(entry.sizeBytes / 1024)}K`
            : `${entry.sizeBytes}B`
          : "";
      lines.push(`${indent}${entry.name}${size ? `  (${size})` : ""}`);
    }
  }
  return lines.join("\n");
}

async function getRuntimeContext(
  ctl: PluginController,
  requestId: string,
  toolName: string,
  signal: AbortSignal,
): Promise<{
  cfg: EffectiveConfig;
  registry: RuntimeRegistry;
  targets: RuntimeTargetName[];
  roots: ResolvedSkillRoot[];
}> {
  const cfg = await timedStep(requestId, toolName, "resolve_config", async () =>
    resolveEffectiveConfig(ctl),
  );
  const registry = await timedStep(requestId, toolName, "create_runtime_registry", async () =>
    createRuntimeRegistry(cfg),
  );
  const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
  logDiagnostic({
    event: "runtime_context",
    requestId,
    tool: toolName,
    skillsEnvironment: cfg.skillsEnvironment,
    targets,
    skillsPaths: cfg.skillsPaths,
    autoInject: cfg.autoInject,
    maxSkillsInContext: cfg.maxSkillsInContext,
    wslDistro: cfg.wslDistro || undefined,
    hasWindowsShellPath: Boolean(cfg.windowsShellPath),
    hasWslShellPath: Boolean(cfg.wslShellPath),
  });
  const roots = await timedStep(
    requestId,
    toolName,
    "resolve_skill_roots",
    async () => resolveSkillRoots(cfg.skillsPaths, targets, registry, signal),
    { targetCount: targets.length, rawPathCount: cfg.skillsPaths.length },
  );
  logDiagnostic({
    event: "roots_resolved",
    requestId,
    tool: toolName,
    rootCount: roots.length,
    roots: roots.map((r) => ({
      environment: r.environment,
      rawPath: r.rawPath,
      resolvedPath: r.resolvedPath,
      displayPath: r.displayPath,
    })),
  });
  return { cfg, registry, targets, roots };
}

async function withToolLogging<T>(
  ctl: PluginController,
  toolName: string,
  args: Record<string, unknown>,
  timeoutMs: number,
  fn: (requestId: string, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const requestId = createRequestId(toolName);
  const startedAt = Date.now();
  const timeout = createTimeoutSignal(
    ctl.abortSignal,
    timeoutMs,
    `${toolName} tool request`,
  );
  logDiagnostic({ event: "tool_start", requestId, tool: toolName, timeoutMs, args });
  try {
    const result = await fn(requestId, timeout.signal);
    logDiagnostic({
      event: "tool_complete",
      requestId,
      tool: toolName,
      elapsedMs: Date.now() - startedAt,
      timeoutMs,
    });
    return result;
  } catch (error) {
    const timedOut = isTimeoutError(error);
    logDiagnostic({
      event: timedOut ? "tool_timeout" : "tool_error",
      requestId,
      tool: toolName,
      elapsedMs: Date.now() - startedAt,
      timeoutMs,
      error: serializeError(error),
    });
    if (timedOut) {
      return {
        success: false,
        timedOut: true,
        error: error instanceof Error ? error.message : `${toolName} timed out.`,
        hint: "The plugin aborted this tool request so the model cannot hang indefinitely. Try a narrower skill name/query or reduce the target directory size.",
      } as T;
    }
    throw error;
  } finally {
    timeout.cleanup();
  }
}


export async function toolsProvider(ctl: PluginController) {
  const listSkillsTool = tool({
    name: "list_skills",
    description:
      "List or search available skills. " +
      "Without a query, returns all skills up to the limit. " +
      "With a query, searches skills. Pass mode='route' to use the same deterministic metadata router used by prompt injection. " +
      "Do not call this tool just because the user wrote $skill-name; explicit $skill activations are handled by the prompt preprocessor and may already be expanded. " +
      "For routed candidates only, call read_skill_file on any skill that looks relevant before starting work.",
    parameters: {
      query: listSkillsQuerySchema.describe("Optional search query."),
      limit: listSkillsLimitSchema,
      mode: z.enum(["search", "route"]).optional().describe("Use 'route' to apply deterministic skill routing instead of broad full-text search."),
    },
    implementation: async ({ query, limit, mode }, { status }) =>
      withToolLogging(ctl, "list_skills", { query, limit, mode }, TOOL_LIST_SKILLS_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "list_skills", toolSignal);
        const cap = limit ?? LIST_SKILLS_DEFAULT_LIMIT;

        if (mode === "route" && !(query && query.trim())) {
          return {
            success: false,
            mode: "route",
            found: 0,
            skills: [],
            note: "Route mode needs a concrete query. If the user wrote $skill-name, treat it as explicit activation handled by the preprocessor instead of listing all skills.",
          };
        }

        if (query && query.trim()) {
          const trimmedQuery = query.trim();
          status(`Searching skills for "${trimmedQuery}"..`);

          if (mode === "route") {
            const exact = await timedStep(
              requestId,
              "list_skills",
              "resolve_exact_skill_query_for_route",
              async () => resolveExactSkillQuery(roots, registry, trimmedQuery, toolSignal),
              { query: trimmedQuery, rootCount: roots.length },
            );

            if (exact) {
              const exactSkill = exact.skill;
              status(`Found exact skill ${exactSkill.name}`);
              logDiagnostic({
                event: "list_skills_exact_result",
                requestId,
                tool: "list_skills",
                query: trimmedQuery,
                matchedQuery: exact.matchedQuery,
                mode: "route",
                skill: exactSkill.name,
                environment: exactSkill.environment,
                resolvedDirectoryPath: exactSkill.resolvedDirectoryPath,
              });
              return {
                query: trimmedQuery,
                matchedQuery: exact.matchedQuery,
                mode: "route",
                total: 1,
                found: 1,
                threshold: 0,
                queryTokens: trimmedQuery.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
                exactMatch: true,
                note: "Exact skill match resolved directly before route scanning.",
                selected: [
                  {
                    name: exactSkill.name,
                    description: exactSkill.description,
                    tags: exactSkill.tags.length > 0 ? exactSkill.tags : undefined,
                    environment: exactSkill.environment,
                    skillMdPath: exactSkill.skillMdPath,
                    displayPath: exactSkill.displayPath,
                    hasExtraFiles: exactSkill.hasExtraFiles,
                    score: 999,
                    confidence: "exact",
                    reasons: ["exact_skill_name_or_directory_match"],
                    source: "exact",
                  },
                ],
              };
            }

            const skills = await timedStep(
              requestId,
              "list_skills",
              "scan_skills_for_route",
              async () => scanSkills(roots, registry, toolSignal),
              { query: trimmedQuery, rootCount: roots.length },
            );
            const routed = routeSkills(trimmedQuery, skills, cap);
            logDiagnostic({
              event: "list_skills_route_result",
              requestId,
              tool: "list_skills",
              query: trimmedQuery,
              selected: routed.selected.map(summarizeRouteCandidate).join(" | ") || "-",
              rejectedBest: routed.bestRejected ? summarizeRouteCandidate(routed.bestRejected) : "-",
              total: skills.length,
              returned: routed.selected.length,
            });
            return {
              query: trimmedQuery,
              mode: "route",
              total: skills.length,
              found: routed.selected.length,
              threshold: routed.threshold,
              queryTokens: routed.queryTokens,
              selected: routed.selected.map((candidate) => ({
                name: candidate.skill.name,
                description: candidate.skill.description,
                tags: candidate.skill.tags.length > 0 ? candidate.skill.tags : undefined,
                environment: candidate.skill.environment,
                skillMdPath: candidate.skill.skillMdPath,
                displayPath: candidate.skill.displayPath,
                hasExtraFiles: candidate.skill.hasExtraFiles,
                score: candidate.score,
                confidence: candidate.confidence,
                reasons: candidate.reasons,
                source: candidate.source,
              })),
              bestRejected: routed.bestRejected
                ? {
                    name: routed.bestRejected.skill.name,
                    score: routed.bestRejected.score,
                    confidence: routed.bestRejected.confidence,
                    reasons: routed.bestRejected.reasons,
                  }
                : undefined,
            };
          }

          const exact = await timedStep(
            requestId,
            "list_skills",
            "resolve_exact_skill_query",
            async () => resolveExactSkillQuery(roots, registry, trimmedQuery, toolSignal),
            { query: trimmedQuery, rootCount: roots.length },
          );

          if (exact) {
            const exactSkill = exact.skill;
            status(`Found exact skill ${exactSkill.name}`);
            logDiagnostic({
              event: "list_skills_exact_result",
              requestId,
              tool: "list_skills",
              query: trimmedQuery,
              matchedQuery: exact.matchedQuery,
              skill: exactSkill.name,
              environment: exactSkill.environment,
              resolvedDirectoryPath: exactSkill.resolvedDirectoryPath,
            });
            return {
              query: trimmedQuery,
              total: 1,
              found: 1,
              skillsEnvironment: cfg.skillsEnvironment,
              roots,
              note: "Exact skill match resolved directly without scanning all skill files.",
              skills: [
                {
                  name: exactSkill.name,
                  description: exactSkill.description,
                  tags: exactSkill.tags.length > 0 ? exactSkill.tags : undefined,
                  environment: exactSkill.environment,
                  skillMdPath: exactSkill.skillMdPath,
                  displayPath: exactSkill.displayPath,
                  hasExtraFiles: exactSkill.hasExtraFiles,
                  score: 10,
                },
              ],
            };
          }

          const results = await timedStep(
            requestId,
            "list_skills",
            "search_skills",
            async () => searchSkills(roots, registry, trimmedQuery, toolSignal),
            { query: trimmedQuery, rootCount: roots.length },
          );

          if (results.length === 0) {
            return {
              query: trimmedQuery,
              found: 0,
              skills: [],
              roots,
              note: "No skills matched. Try a broader query or omit the query to list all skills.",
            };
          }

          const page = results.slice(0, cap);
          status(`Found ${results.length} match${results.length !== 1 ? "es" : ""}`);
          logDiagnostic({ event: "list_skills_result", requestId, tool: "list_skills", total: results.length, returned: page.length });

          return {
            query: trimmedQuery,
            total: results.length,
            found: page.length,
            skillsEnvironment: cfg.skillsEnvironment,
            roots,
            ...(results.length > cap
              ? { note: `Showing top ${cap} of ${results.length} matches.` }
              : {}),
            skills: page.map(({ skill, score }) => ({
              name: skill.name,
              description: skill.description,
              tags: skill.tags.length > 0 ? skill.tags : undefined,
              environment: skill.environment,
              skillMdPath: skill.skillMdPath,
              displayPath: skill.displayPath,
              hasExtraFiles: skill.hasExtraFiles,
              score: Math.round(score * 100) / 100,
            })),
          };
        }

        status("Scanning skills directories..");
        const skills = await timedStep(
          requestId,
          "list_skills",
          "scan_skills",
          async () => scanSkills(roots, registry, toolSignal),
          { rootCount: roots.length },
        );

        if (skills.length === 0) {
          return {
            total: 0,
            found: 0,
            skillsEnvironment: cfg.skillsEnvironment,
            roots,
            skills: [],
            note: "No skills found. Create skill directories with a SKILL.md file inside the configured skills paths.",
          };
        }

        const page = skills.slice(0, cap);
        status(`Found ${skills.length} skill${skills.length !== 1 ? "s" : ""}`);
        logDiagnostic({ event: "list_skills_result", requestId, tool: "list_skills", total: skills.length, returned: page.length });

        return {
          total: skills.length,
          found: page.length,
          skillsEnvironment: cfg.skillsEnvironment,
          roots,
          ...(skills.length > cap
            ? { note: `Showing ${cap} of ${skills.length} skills.` }
            : {}),
          skills: page.map((s) => ({
            name: s.name,
            description: s.description,
            tags: s.tags.length > 0 ? s.tags : undefined,
            environment: s.environment,
            skillMdPath: s.skillMdPath,
            displayPath: s.displayPath,
            hasExtraFiles: s.hasExtraFiles,
          })),
        };
      }),
  });

  const readSkillFileTool = tool({
    name: "read_skill_file",
    description:
      "Read a file from within a skill directory. Accepts a skill name, an environment-prefixed display path such as WSL:/path, or an absolute path within a configured skill root.",
    parameters: {
      skill_name: skillNameSchema.describe("Skill name or absolute/display path."),
      file_path: optionalRelativeSkillPathSchema.describe("Relative path inside the skill directory. Omit for SKILL.md."),
    },
    implementation: async ({ skill_name, file_path }, { status }) =>
      withToolLogging(ctl, "read_skill_file", { skill_name, file_path }, TOOL_READ_SKILL_FILE_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "read_skill_file", toolSignal);
        status(`Reading ${skill_name}${file_path ? ` / ${file_path}` : ""}..`);

        if (
          skill_name.startsWith("WSL:") ||
          skill_name.startsWith("Windows:") ||
          path.isAbsolute(skill_name)
        ) {
          const result = await timedStep(
            requestId,
            "read_skill_file",
            "read_absolute_path",
            async () => readAbsolutePath(skill_name, roots, registry, toolSignal),
            { skill_name, file_path },
          );
          if ("error" in result) return { success: false, error: result.error };
          status(`Read ${Math.round(result.content.length / 1024)}KB`);
          logDiagnostic({
            event: "read_skill_file_result",
            requestId,
            tool: "read_skill_file",
            mode: "absolute",
            environment: result.environment,
            resolvedPath: result.resolvedPath,
            contentLength: result.content.length,
          });
          return {
            success: true,
            environment: result.environment,
            filePath: result.resolvedPath,
            displayPath: `${result.environment === "wsl" ? "WSL" : "Windows"}:${result.resolvedPath}`,
            content: result.content,
          };
        }

        const skill = await timedStep(
          requestId,
          "read_skill_file",
          "resolve_skill_by_name",
          async () => resolveSkillByName(roots, registry, skill_name, toolSignal),
          { skill_name, rootCount: roots.length },
        );

        if (!skill) {
          logDiagnostic({ event: "skill_not_found", requestId, tool: "read_skill_file", skill_name, rootCount: roots.length });
          return {
            success: false,
            error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
          };
        }

        logDiagnostic({
          event: "skill_resolved",
          requestId,
          tool: "read_skill_file",
          requestedSkill: skill_name,
          resolvedSkill: skill.name,
          environment: skill.environment,
          resolvedDirectoryPath: skill.resolvedDirectoryPath,
          resolvedSkillMdPath: skill.resolvedSkillMdPath,
        });

        const result = await timedStep(
          requestId,
          "read_skill_file",
          "read_skill_file_content",
          async () => readSkillFile(skill, file_path, registry, toolSignal),
          { skill: skill.name, file_path: file_path || "SKILL.md", environment: skill.environment },
        );
        if ("error" in result) return { success: false, skill: skill_name, error: result.error };

        status(`Read ${Math.round(result.content.length / 1024)}KB from ${skill.name}`);
        logDiagnostic({
          event: "read_skill_file_result",
          requestId,
          tool: "read_skill_file",
          mode: "skill",
          skill: skill.name,
          environment: skill.environment,
          resolvedPath: result.resolvedPath,
          contentLength: result.content.length,
          hasExtraFiles: skill.hasExtraFiles,
        });

        return {
          success: true,
          skill: skill.name,
          environment: skill.environment,
          filePath: file_path || "SKILL.md",
          resolvedPath: result.resolvedPath,
          displayPath: `${skill.environment === "wsl" ? "WSL" : "Windows"}:${result.resolvedPath}`,
          content: result.content,
          hasExtraFiles: skill.hasExtraFiles,
          ...(skill.hasExtraFiles
            ? { hint: "This skill has additional files. Call list_skill_files to explore them." }
            : {}),
        };
      }),
  });

  const listSkillFilesTool = tool({
    name: "list_skill_files",
    description:
      "List all files inside a skill directory. Accepts a skill name or an environment-prefixed display path.",
    parameters: {
      skill_name: skillNameSchema.describe("Skill name or absolute/display path."),
      sub_path: optionalRelativeSkillPathSchema.describe("Optional relative sub-path within the skill directory."),
    },
    implementation: async ({ skill_name, sub_path }, { status }) =>
      withToolLogging(ctl, "list_skill_files", { skill_name, sub_path }, TOOL_LIST_SKILL_FILES_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "list_skill_files", toolSignal);
        status(`Listing files in ${skill_name}..`);

        if (
          skill_name.startsWith("WSL:") ||
          skill_name.startsWith("Windows:") ||
          path.isAbsolute(skill_name)
        ) {
          const entries = await timedStep(
            requestId,
            "list_skill_files",
            "list_absolute_directory",
            async () => listAbsoluteDirectory(skill_name, roots, registry, toolSignal),
            { skill_name, sub_path },
          );
          const formatted = formatDirEntries(entries, path.basename(skill_name));
          status(`Found ${entries.length} entries`);
          logDiagnostic({ event: "list_skill_files_result", requestId, tool: "list_skill_files", mode: "absolute", entryCount: entries.length });
          return {
            success: true,
            directoryPath: skill_name,
            entryCount: entries.length,
            tree: formatted,
            entries: entries.map((e) => ({
              name: e.name,
              path: e.relativePath,
              type: e.type,
              environment: e.environment,
              ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
            })),
          };
        }

        const skill = await timedStep(
          requestId,
          "list_skill_files",
          "resolve_skill_by_name",
          async () => resolveSkillByName(roots, registry, skill_name, toolSignal),
          { skill_name, rootCount: roots.length },
        );

        if (!skill) {
          logDiagnostic({ event: "skill_not_found", requestId, tool: "list_skill_files", skill_name, rootCount: roots.length });
          return {
            success: false,
            error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
          };
        }

        const entries = await timedStep(
          requestId,
          "list_skill_files",
          "list_skill_directory",
          async () => listSkillDirectory(skill, sub_path, registry, toolSignal),
          { skill: skill.name, environment: skill.environment, sub_path },
        );
        const formatted = formatDirEntries(entries, skill.name);

        status(`Found ${entries.length} entries in ${skill_name}`);
        logDiagnostic({ event: "list_skill_files_result", requestId, tool: "list_skill_files", mode: "skill", skill: skill.name, environment: skill.environment, entryCount: entries.length });

        return {
          success: true,
          skill: skill.name,
          environment: skill.environment,
          directoryPath: skill.directoryPath,
          displayPath: `${skill.environment === "wsl" ? "WSL" : "Windows"}:${skill.directoryPath}`,
          entryCount: entries.length,
          tree: formatted,
          entries: entries.map((e) => ({
            name: e.name,
            path: e.relativePath,
            type: e.type,
            environment: e.environment,
            ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
          })),
        };
      }),
  });

  const runCommandTool = tool({
    name: "run_command",
    description:
      "Execute a shell command only when plugin settings explicitly allow it. Disabled by default. Read-only mode allows simple inspection commands only; guarded mode still blocks dangerous patterns. Do not use run_command for $skill-name tokens; $skill-name is explicit skill activation syntax, not a shell command.",
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
      ),
  });

  return [listSkillsTool, readSkillFileTool, listSkillFilesTool, runCommandTool];
}
