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
  TOOL_FILE_OPERATION_TIMEOUT_MS,
  TOOL_COMMAND_SETUP_TIMEOUT_MS,
} from "./constants";
import {
  scanSkills,
  searchSkillSet,
  resolveSkillByName,
  readSkillFile,
  readAbsolutePath,
  readFileWithinRoots,
  writeFileWithinRoots,
  editFileWithinRoots,
  listSkillDirectory,
  listAbsoluteDirectory,
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

type ToolUiReporter = {
  status?: (message: string) => void;
  warn?: (message: string) => void;
};

const SKILL_STRUCTURE_HINT =
  "A skill directory uses SKILL.md as the entrypoint. Supporting assets may live in references/, templates/, examples/, scripts/, or other relative paths. Read SKILL.md first, then call list_skill_files and read_skill_file with a relative file_path for referenced support files when needed.";

const SKILL_SEARCH_WORKFLOW_HINT =
  "Skill workflow: if the user wrote $skill-name and the preprocessor expanded it, apply the expanded skill directly and do not rediscover it. If an explicit $skill-name was not expanded or is unresolved, call list_skills with that exact token first. If list_skills finds nothing and the user suspects a custom or nested skill collection, call search_skill_roots for likely patterns or list_skill_roots to inspect the configured skill-root tree. For normal specialized tasks, use routed candidates first; otherwise call list_skills with a concise task query. After choosing a candidate, call read_skill_file with the exact skill name. Use list_skill_files only after SKILL.md references supporting assets. Do not call qmd, ck, grep, shell commands, or run_command for skill discovery.";

const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000;
const SKILL_ROOT_SEARCH_DEFAULT_LIMIT = 50;
const SKILL_ROOT_SEARCH_MAX_LIMIT = 200;
const TOOL_VISIBLE_STILL_WORKING_MS = 5_000;

function compactToolStatusValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "-";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function emitToolDebugStatus(
  ui: ToolUiReporter | undefined,
  message: string,
  details: Record<string, unknown> = {},
): void {
  if (!ui?.status) return;
  const compactDetails = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${compactToolStatusValue(value)}`)
    .join(" ");
  ui.status(`[debug] ${message}${compactDetails ? ` (${compactDetails})` : ""}`);
}

function emitToolDebugWarning(
  ui: ToolUiReporter | undefined,
  message: string,
  details: Record<string, unknown> = {},
): void {
  if (!ui?.warn && !ui?.status) return;
  const compactDetails = Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${key}=${compactToolStatusValue(value)}`)
    .join(" ");
  const text = `[debug] ${message}${compactDetails ? ` (${compactDetails})` : ""}`;
  if (ui.warn) ui.warn(text);
  else ui.status?.(text);
}

const skillRootSearchPatternSchema = z
  .string()
  .trim()
  .min(1, "Search pattern is required.")
  .max(500, "Search pattern is too long.")
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Search pattern cannot contain control characters.");

const skillRootSearchLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(SKILL_ROOT_SEARCH_MAX_LIMIT)
  .optional()
  .describe(`Maximum number of matching root entries to return. Defaults to ${SKILL_ROOT_SEARCH_DEFAULT_LIMIT}.`);

function skillSearchBackendSummary(
  cfg: EffectiveConfig,
  result?: EnhancedSkillSearchResult,
  shortCircuit?: { reason: string; stage: string },
) {
  if (result) {
    return {
      requested: result.requested,
      active: result.active,
      fallbackUsed: result.fallbackUsed,
      fallbackReason: result.fallbackReason,
      available: result.available,
      rawResultCount: result.rawResultCount,
      options: result.options,
      diagnostics: result.diagnostics,
      workflowHint: SKILL_SEARCH_WORKFLOW_HINT,
    };
  }
  return {
    requested: cfg.skillSearchBackend,
    active: "builtin",
    fallbackUsed: false,
    enhancedSkipped: shortCircuit !== undefined,
    enhancedSkippedReason: shortCircuit?.reason,
    resolutionStage: shortCircuit?.stage,
    options: {
      qmdExecutable: cfg.qmdExecutable,
      ckExecutable: cfg.ckExecutable,
    },
    workflowHint: SKILL_SEARCH_WORKFLOW_HINT,
  };
}

function skillNextStepHint(skill: SkillInfo): string {
  return skill.hasExtraFiles
    ? "Call read_skill_file with this exact skill name first. If SKILL.md references support assets or more detail is needed, call list_skill_files, then read_skill_file again with the relative file_path."
    : "Call read_skill_file with this exact skill name before doing covered work.";
}

function skillFrontmatterSummary(skill: SkillInfo): Record<string, unknown> | undefined {
  const frontmatter = skill.frontmatter;
  if (!frontmatter) return undefined;
  const summary: Record<string, unknown> = {};
  for (const key of [
    "allowedTools",
    "context",
    "agent",
    "model",
    "effort",
    "argumentHint",
    "arguments",
    "license",
    "compatibility",
    "metadata",
    "paths",
    "hooks",
    "shell",
  ] as const) {
    const value = frontmatter[key];
    if (value !== undefined) summary[key] = value;
  }
  if (frontmatter.extensionMetadata && Object.keys(frontmatter.extensionMetadata).length > 0) {
    summary.extensionMetadata = frontmatter.extensionMetadata;
    summary.extensionMetadataNote = "Unrecognized frontmatter keys are preserved here for compatibility with other skill ecosystems. They are metadata only unless this plugin explicitly implements their behavior.";
  }
  if (frontmatter.allowedTools?.length) {
    summary.allowedToolsNote = "Skill-declared allowed-tools are advisory in this plugin; run_command still requires plugin command settings and safety validation.";
  }
  if (frontmatter.arguments?.length || frontmatter.argumentHint) {
    summary.argumentsNote = "If invoking explicitly, pass remaining user text as the task payload; this plugin does not currently perform Claude Code-style argument placeholder substitution.";
  }
  return Object.keys(summary).length > 0 ? summary : undefined;
}

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

interface ToolSkillCandidate {
  skill: SkillInfo;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  source: "exact" | "fuzzy" | "tag" | "description" | "path";
}

function compactSkillText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function skillTokens(value: string): string[] {
  return [...new Set(value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0))];
}

function addCandidateReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function scoreToolSkillCandidate(query: string, skill: SkillInfo): ToolSkillCandidate {
  const queryCompact = compactSkillText(query.replace(/^\$+/, ""));
  const queryTokens = skillTokens(query.replace(/^\$+/, ""));
  const nameTokens = skillTokens(skill.name);
  const directoryName = path.basename(skill.resolvedDirectoryPath.replace(/\\/g, "/"));
  const directoryTokens = skillTokens(directoryName);
  const descriptionTokens = skillTokens(skill.description);
  const tagTokens = skill.tags.flatMap(skillTokens);
  const nameCompact = compactSkillText(skill.name);
  const directoryCompact = compactSkillText(directoryName);
  const reasons: string[] = [];
  let score = 0;

  if (queryCompact.length >= 3 && nameCompact === queryCompact) {
    score += 120;
    addCandidateReason(reasons, "exact:name_compact");
  }
  if (queryCompact.length >= 3 && directoryCompact === queryCompact) {
    score += 115;
    addCandidateReason(reasons, "exact:directory_compact");
  }
  if (queryCompact.length >= 4 && nameCompact.includes(queryCompact)) {
    score += 55;
    addCandidateReason(reasons, "fuzzy:name_contains");
  }
  if (queryCompact.length >= 4 && directoryCompact.includes(queryCompact)) {
    score += 50;
    addCandidateReason(reasons, "fuzzy:directory_contains");
  }

  for (const token of queryTokens) {
    if (token.length === 0) continue;
    if (nameTokens.includes(token)) {
      score += 24;
      addCandidateReason(reasons, `fuzzy:name_token=${token}`);
    } else if (token.length >= 3 && nameTokens.some((nameToken) => nameToken.startsWith(token) || token.startsWith(nameToken))) {
      score += 14;
      addCandidateReason(reasons, `fuzzy:name_prefix=${token}`);
    }

    if (directoryTokens.includes(token)) {
      score += 22;
      addCandidateReason(reasons, `path:directory_token=${token}`);
    } else if (token.length >= 3 && directoryTokens.some((nameToken) => nameToken.startsWith(token) || token.startsWith(nameToken))) {
      score += 12;
      addCandidateReason(reasons, `path:directory_prefix=${token}`);
    }

    if (tagTokens.includes(token)) {
      score += 18;
      addCandidateReason(reasons, `tag:${token}`);
    }
    if (descriptionTokens.includes(token)) {
      score += 5;
      addCandidateReason(reasons, `description:${token}`);
    }
  }

  const source = reasons.some((reason) => reason.startsWith("exact:"))
    ? "exact"
    : reasons.some((reason) => reason.startsWith("tag:"))
      ? "tag"
      : reasons.some((reason) => reason.startsWith("description:"))
        ? "description"
        : reasons.some((reason) => reason.startsWith("path:"))
          ? "path"
          : "fuzzy";
  return {
    skill,
    score: Math.round(score),
    confidence: score >= 70 ? "high" : score >= 25 ? "medium" : "low",
    reasons,
    source,
  };
}

function fuzzySkillCandidates(query: string, skills: SkillInfo[], limit: number): ToolSkillCandidate[] {
  return skills
    .map((skill) => scoreToolSkillCandidate(query, skill))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit);
}

function skillCandidateResult(candidate: ToolSkillCandidate) {
  return {
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
    nextStep: skillNextStepHint(candidate.skill),
    frontmatter: skillFrontmatterSummary(candidate.skill),
  };
}

async function suggestSkillsForQuery(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<ToolSkillCandidate[]> {
  const skills = await scanSkills(roots, registry, signal);
  return fuzzySkillCandidates(query, skills, limit);
}

function joinRootSubPath(root: ResolvedSkillRoot, subPath?: string): string {
  if (!subPath) return root.resolvedPath;
  return root.environment === "windows"
    ? path.win32.join(root.resolvedPath, subPath)
    : path.posix.join(root.resolvedPath, subPath);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globPatternToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/").replace(/^\/+/, "");
  let source = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegExp(char);
    }
  }
  source += "$";
  return new RegExp(source, "i");
}

function skillRootSearchVariants(pattern: string): string[] {
  const normalizedPattern = pattern.replace(/\\/g, "/").trim().toLowerCase();
  const tokens = normalizedPattern
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  const variants = new Set<string>();
  if (normalizedPattern) variants.add(normalizedPattern);
  for (const token of tokens) {
    variants.add(token);
    if (token.endsWith("s") && token.length > 3) variants.add(token.slice(0, -1));
  }
  return [...variants];
}

function preferredSkillRootFallbackPattern(query: string): string {
  const variants = skillRootSearchVariants(query);
  const promptVariant = variants.find((variant) => variant === "prompt" || variant === "prompts");
  if (promptVariant) return "prompt";
  return variants.find((variant) => !["write", "writing", "craft", "crafting", "skill", "skills"].includes(variant))
    ?? variants[0]
    ?? query;
}

function entryMatchesSkillRootSearch(entry: DirectoryEntry, pattern: string): boolean {
  const normalizedPath = entry.relativePath.replace(/\\/g, "/").toLowerCase();
  const normalizedName = entry.name.toLowerCase();
  const normalizedPattern = pattern.replace(/\\/g, "/").trim();
  if (!normalizedPattern.includes("*") && !normalizedPattern.includes("?")) {
    return skillRootSearchVariants(normalizedPattern).some((needle) =>
      normalizedPath.includes(needle) || normalizedName.includes(needle),
    );
  }
  return globPatternToRegExp(normalizedPattern).test(normalizedPath);
}

function formatDirEntries(entries: DirectoryEntry[], rootName: string) {
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

function dirnameForTarget(environment: RuntimeTargetName, value: string): string {
  return environment === "windows" ? path.win32.dirname(value) : path.posix.dirname(value);
}

function basenameForTarget(environment: RuntimeTargetName, value: string): string {
  return environment === "windows" ? path.win32.basename(value) : path.posix.basename(value);
}

function dirnameDisplayPath(displayPath: string): string {
  const parsed = displayPath.match(/^(Windows|WSL):(.*)$/);
  if (!parsed) return path.posix.dirname(displayPath);
  const label = parsed[1];
  const rawPath = parsed[2];
  const dir = label === "Windows" ? path.win32.dirname(rawPath) : path.posix.dirname(rawPath);
  return `${label}:${dir}`;
}

function skillEntrypointFollowup(entry: {
  rootIndex: number;
  environment: RuntimeTargetName;
  path: string;
  displayPath?: string;
}) {
  const skillDirectoryPath = dirnameForTarget(entry.environment, entry.path);
  const skillNameCandidate = basenameForTarget(entry.environment, skillDirectoryPath);
  const displayPath = entry.displayPath;
  const skillDirectoryDisplayPath = displayPath ? dirnameDisplayPath(displayPath) : undefined;
  return {
    rootIndex: entry.rootIndex,
    environment: entry.environment,
    path: entry.path,
    skillDirectoryPath,
    skillNameCandidate,
    ...(displayPath ? { displayPath } : {}),
    ...(skillDirectoryDisplayPath ? { skillDirectoryDisplayPath } : {}),
    readSkillFileArgs: { skill_name: skillNameCandidate },
    ...(displayPath ? { readSkillFileDisplayPathArgs: { skill_name: displayPath } } : {}),
    note: "Use readSkillFileArgs exactly to read this skill entrypoint. Do not pass this SKILL.md path as file_path; omit file_path for SKILL.md.",
  };
}

function normalizeReadSkillFileRequest(skillName: string, filePath?: string): { skillName: string; filePath?: string; note?: string } {
  const normalizedSkill = skillName.trim();
  const normalizedFile = filePath?.trim();
  if (!normalizedFile || normalizedFile === "SKILL.md") {
    return { skillName: normalizedSkill, filePath: undefined };
  }

  const fileNormalized = normalizedFile.replace(/\\/g, "/");
  const skillNormalized = normalizedSkill.replace(/\\/g, "/").replace(/\/$/, "");
  if (fileNormalized.endsWith("/SKILL.md")) {
    const fileParent = fileNormalized.slice(0, -"/SKILL.md".length).replace(/\/$/, "");
    const fileParentBase = fileParent.split("/").filter(Boolean).pop();
    const skillBase = skillNormalized.split("/").filter(Boolean).pop();
    if (fileParent === skillNormalized || (fileParentBase && skillBase && fileParentBase === skillBase)) {
      return {
        skillName: normalizedSkill,
        filePath: undefined,
        note: "Normalized duplicated SKILL.md path from file_path; omit file_path when reading a skill entrypoint.",
      };
    }
  }

  return { skillName: normalizedSkill, filePath: normalizedFile };
}

async function getRuntimeContext(
  ctl: PluginController,
  requestId: string,
  toolName: string,
  signal: AbortSignal,
  ui?: ToolUiReporter,
): Promise<{
  cfg: EffectiveConfig;
  registry: RuntimeRegistry;
  targets: RuntimeTargetName[];
  roots: ResolvedSkillRoot[];
}> {
  emitToolDebugStatus(ui, `${toolName}: resolving configuration`, { requestId });
  const cfg = await timedStep(requestId, toolName, "resolve_config", async () =>
    resolveEffectiveConfig(ctl),
  );
  emitToolDebugStatus(ui, `${toolName}: creating runtime registry`, {
    environment: cfg.skillsEnvironment,
    paths: cfg.skillsPaths.length,
  });
  const registry = await timedStep(requestId, toolName, "create_runtime_registry", async () =>
    createRuntimeRegistry(cfg),
  );
  const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
  emitToolDebugStatus(ui, `${toolName}: runtime targets ready`, {
    targets: targets.join(","),
    backend: cfg.skillSearchBackend,
  });
  logDiagnostic({
    event: "runtime_context",
    requestId,
    tool: toolName,
    skillsEnvironment: cfg.skillsEnvironment,
    targets,
    skillsPaths: cfg.skillsPaths,
    autoInject: cfg.autoInject,
    maxSkillsInContext: cfg.maxSkillsInContext,
    skillSearchBackend: cfg.skillSearchBackend,
    wslDistro: cfg.wslDistro || undefined,
    hasWindowsShellPath: Boolean(cfg.windowsShellPath),
    hasWslShellPath: Boolean(cfg.wslShellPath),
  });
  emitToolDebugStatus(ui, `${toolName}: resolving skill roots`, {
    targets: targets.length,
    rawPaths: cfg.skillsPaths.length,
  });
  const roots = await timedStep(
    requestId,
    toolName,
    "resolve_skill_roots",
    async () => resolveSkillRoots(cfg.skillsPaths, targets, registry, signal),
    { targetCount: targets.length, rawPathCount: cfg.skillsPaths.length },
  );
  emitToolDebugStatus(ui, `${toolName}: resolved skill roots`, { roots: roots.length });
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
    const nextToolCall = query
      ? {
          tool: "list_skills",
          parameters: recommendedParameters,
          required: true,
          instruction: "Call this tool now. Do not ask the user for permission and do not produce a final answer from this timeout result.",
        }
      : {
          tool: "search_skill_roots",
          parameters: { pattern: fallbackPattern, limit: 50 },
          required: true,
          instruction: "Call this tool now to inspect SKILL.md entrypoints. Do not retry an unfiltered list_skills call, do not ask the user for permission, and do not infer the total skill count from this timeout.",
        };
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
      note: "This timeout is not an empty search result. Do not tell the user that no matching skills exist based only on this response, and do not ask whether to continue before trying the provided nextToolCall.",
      hint: query
        ? "Immediately make nextToolCall. If that also times out, immediately call search_skill_roots with fallbackToolCall.parameters. Only answer the user after a non-timeout result or after both recovery tools fail."
        : "Immediately call nextToolCall to inspect SKILL.md entrypoints. Do not retry the same unfiltered list_skills call and do not infer that previously found skills are the only available skills.",
      recommendedRecovery: query
        ? {
            tool: "list_skills",
            parameters: recommendedParameters,
            reason: "A small query search can use plugin-controlled qmd/ck enhanced search when available, then fall back to built-in matching.",
          }
        : {
            tool: "search_skill_roots",
            parameters: { pattern: fallbackPattern, limit: 50 },
            reason: "An unfiltered skill listing timed out. Inspect SKILL.md entrypoints instead of retrying the same broad list or inferring the total catalog size.",
          },
      nextToolCall,
      fallbackToolCall: {
        tool: "search_skill_roots",
        parameters: { pattern: fallbackPattern, limit: 50 },
        instruction: "Use this immediately if nextToolCall also times out or returns no candidates. Then read any discovered entrypoint using readSkillFileArgs.",
      },
      fallbackTools: ["search_skill_roots", "list_skill_roots"],
      finalAnswerGuidance: "Do not produce a final user-facing answer from this timeout result. Continue with nextToolCall first. Never infer total skill count or say previously found skills are the only available skills from a timeout. Only say no matching skill exists after a non-timeout result returns found=0 and root inspection finds no relevant SKILL.md entrypoint.",
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

async function withToolLogging<T>(
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


export async function toolsProvider(ctl: PluginController) {
  const listSkillsTool = tool({
    name: "list_skills",
    description:
      "List or search available skills. " +
      "Without a query, returns all skills up to the limit. " +
      "With a query, searches skills and can surface fuzzy candidates for partial names, missing hyphens, or nearby skill words. " +
      "The plugin controls the search backend internally; do not call qmd, ck, grep, or shell commands directly for skill discovery. " +
      "Pass mode='route' to use the same deterministic metadata router used by prompt injection. " +
      "Do not call this tool just because the user wrote $skill-name; explicit $skill activations are handled by the prompt preprocessor and may already be expanded. " +
      "For routed/search candidates, call read_skill_file on the best relevant exact skill name before starting covered work. If hasExtraFiles is true, use list_skill_files to inspect references/templates/examples/scripts only when SKILL.md or the task needs them.",
    parameters: {
      query: listSkillsQuerySchema.describe("Optional search query."),
      limit: listSkillsLimitSchema,
      mode: z.enum(["search", "route"]).optional().describe("Use 'route' to apply deterministic skill routing instead of broad full-text search."),
    },
    implementation: async ({ query, limit, mode }, { status }) =>
      withToolLogging(ctl, "list_skills", { query, limit, mode }, TOOL_LIST_SKILLS_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "list_skills", toolSignal, { status });
        const cap = limit ?? LIST_SKILLS_DEFAULT_LIMIT;
        const searchBackend = skillSearchBackendSummary(cfg);

        if (mode === "route" && !(query && query.trim())) {
          return {
            success: false,
            mode: "route",
            found: 0,
            skills: [],
            searchBackend,
            note: "Route mode needs a concrete query. If the user wrote $skill-name, treat it as explicit activation handled by the preprocessor instead of listing all skills.",
          };
        }

        if (query && query.trim()) {
          const trimmedQuery = query.trim();
          status(`Searching skills for "${trimmedQuery}"..`);
          emitToolDebugStatus({ status }, "list_skills: query search plan", {
            query: trimmedQuery,
            mode: mode ?? "search",
            roots: roots.length,
            limit: cap,
          });

          if (mode === "route") {
            emitToolDebugStatus({ status }, "list_skills: checking exact skill match", { query: trimmedQuery });
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
                searchBackend: skillSearchBackendSummary(cfg, undefined, {
                  stage: "exact_route_match",
                  reason: "Enhanced qmd/ck search was not run because an exact skill match resolved first.",
                }),
                note: "Exact skill match resolved directly before route scanning; enhanced qmd/ck search was skipped because it was unnecessary.",
                skillStructureHint: SKILL_STRUCTURE_HINT,
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
                    nextStep: skillNextStepHint(exactSkill),
                    frontmatter: skillFrontmatterSummary(exactSkill),
                  },
                ],
              };
            }

            emitToolDebugStatus({ status }, "list_skills: exact route miss; scanning skills for routing", { roots: roots.length });
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
              searchBackend,
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

          emitToolDebugStatus({ status }, "list_skills: checking exact skill match", { query: trimmedQuery });
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
              searchBackend: skillSearchBackendSummary(cfg, undefined, {
                stage: "exact_match",
                reason: "Enhanced qmd/ck search was not run because an exact skill match resolved first.",
              }),
              note: "Exact skill match resolved directly without scanning all skill files; enhanced qmd/ck search was skipped because it was unnecessary.",
              skillStructureHint: SKILL_STRUCTURE_HINT,
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
                  nextStep: skillNextStepHint(exactSkill),
                  frontmatter: skillFrontmatterSummary(exactSkill),
                },
              ],
            };
          }

          let enhancedSearchBackend = searchBackend;
          if (cfg.skillSearchBackend !== "builtin") {
            emitToolDebugStatus({ status }, "list_skills: exact miss; trying configured enhanced backend before filesystem scan", {
              backend: cfg.skillSearchBackend,
            });
            const enhanced = await timedStep(
              requestId,
              "list_skills",
              "enhanced_skill_search_before_scan",
              async () => searchSkillsWithEnhancedBackend(
                cfg.skillSearchBackend,
                roots,
                registry,
                trimmedQuery,
                cap,
                {
                  qmdExecutable: cfg.qmdExecutable,
                  ckExecutable: cfg.ckExecutable,
                },
                toolSignal,
              ),
              { query: trimmedQuery, backend: cfg.skillSearchBackend, rootCount: roots.length },
            );
            enhancedSearchBackend = skillSearchBackendSummary(cfg, enhanced);
            logDiagnostic({
              event: "enhanced_search_result",
              requestId,
              tool: "list_skills",
              query: trimmedQuery,
              requestedBackend: enhanced.requested,
              activeBackend: enhanced.active,
              available: JSON.stringify(enhanced.available),
              fallbackUsed: enhanced.fallbackUsed,
              fallbackReason: enhanced.fallbackReason,
              rawResultCount: enhanced.rawResultCount,
              resolvedCount: enhanced.candidates.length,
              diagnostics: enhanced.diagnostics.join(" | "),
            });

            if (enhanced.candidates.length > 0) {
              logDiagnostic({
                event: "list_skills_result",
                requestId,
                tool: "list_skills",
                total: enhanced.candidates.length,
                returned: enhanced.candidates.length,
                mode: "enhanced",
                query: trimmedQuery,
                backend: enhanced.active,
                requestedBackend: enhanced.requested,
              });
              return {
                query: trimmedQuery,
                mode: "enhanced",
                total: enhanced.candidates.length,
                found: enhanced.candidates.length,
                skillsEnvironment: cfg.skillsEnvironment,
                roots,
                searchBackend: enhancedSearchBackend,
                note: `Enhanced ${enhanced.active} search returned resolvable skill candidates before built-in filesystem scanning. Pick the intended skill and call read_skill_file with its exact name.`,
                skillStructureHint: SKILL_STRUCTURE_HINT,
                skills: enhanced.candidates.map((skill, index) => ({
                  name: skill.name,
                  description: skill.description,
                  tags: skill.tags.length > 0 ? skill.tags : undefined,
                  environment: skill.environment,
                  skillMdPath: skill.skillMdPath,
                  displayPath: skill.displayPath,
                  hasExtraFiles: skill.hasExtraFiles,
                  score: Math.max(1, 100 - index),
                  confidence: index < 3 ? "high" : "medium",
                  reasons: [`enhanced:${enhanced.active}`],
                  source: enhanced.active,
                  nextStep: skillNextStepHint(skill),
                  frontmatter: skillFrontmatterSummary(skill),
                })),
              };
            }
          }

          emitToolDebugStatus({ status }, "list_skills: exact/enhanced miss; scanning skills once for fast fuzzy metadata search", {
            query: trimmedQuery,
            roots: roots.length,
          });
          const scannedSkills = await timedStep(
            requestId,
            "list_skills",
            "scan_skills_for_builtin_search",
            async () => scanSkills(roots, registry, toolSignal),
            { query: trimmedQuery, rootCount: roots.length },
          );
          emitToolDebugStatus({ status }, "list_skills: scan complete", {
            skills: scannedSkills.length,
            query: trimmedQuery,
          });

          const fuzzy = await timedStep(
            requestId,
            "list_skills",
            "fuzzy_skill_candidates",
            async () => fuzzySkillCandidates(trimmedQuery, scannedSkills, cap),
            { query: trimmedQuery, skillCount: scannedSkills.length },
          );

          if (fuzzy.length > 0) {
            logDiagnostic({
              event: "list_skills_result",
              requestId,
              tool: "list_skills",
              total: fuzzy.length,
              returned: fuzzy.length,
              mode: "fuzzy",
              query: trimmedQuery,
            });
            return {
              query: trimmedQuery,
              mode: "fuzzy",
              total: fuzzy.length,
              found: fuzzy.length,
              skillsEnvironment: cfg.skillsEnvironment,
              roots,
              searchBackend,
              note: "Fast fuzzy skill-name candidates matched before enhanced or full-text search. Pick the intended skill and call read_skill_file with its exact name.",
              skillStructureHint: SKILL_STRUCTURE_HINT,
              skills: fuzzy.map(skillCandidateResult),
            };
          }

          emitToolDebugStatus({ status }, "list_skills: enhanced/built-in metadata miss; scoring scanned skill text", { query: trimmedQuery });
          const results = await timedStep(
            requestId,
            "list_skills",
            "score_scanned_skills",
            async () => searchSkillSet(scannedSkills, trimmedQuery, toolSignal),
            { query: trimmedQuery, skillCount: scannedSkills.length },
          );

          if (results.length === 0) {
            return {
              query: trimmedQuery,
              found: 0,
              skills: [],
              roots,
              searchBackend: enhancedSearchBackend,
              note: "No skills matched. Try a broader query or omit the query to list all skills. Use concise terms from the user's task, expected file type, tool name, or workflow.",
              skillStructureHint: SKILL_STRUCTURE_HINT,
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
            skillStructureHint: SKILL_STRUCTURE_HINT,
            searchBackend: enhancedSearchBackend,
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
              nextStep: skillNextStepHint(skill),
              frontmatter: skillFrontmatterSummary(skill),
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
            skillStructureHint: SKILL_STRUCTURE_HINT,
            searchBackend,
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
          skillStructureHint: SKILL_STRUCTURE_HINT,
          searchBackend,
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
            nextStep: skillNextStepHint(s),
            frontmatter: skillFrontmatterSummary(s),
          })),
        };
      }, { recoveryTimeoutMs: LIST_SKILLS_RECOVERY_TIMEOUT_MS, ui: { status } }),
  });

  const readSkillFileTool = tool({
    name: "read_skill_file",
    description:
      "Read SKILL.md or a relative support file from within a skill directory. Accepts a skill name, an environment-prefixed display path such as WSL:/path, or an absolute path within a configured skill root. Omit file_path to read SKILL.md first. Use file_path for support assets discovered with list_skill_files, such as references/patterns.md, templates/example.md, examples/demo.md, or scripts/helper.py.",
    parameters: {
      skill_name: skillNameSchema.describe("Skill name or absolute/display path."),
      file_path: optionalRelativeSkillPathSchema.describe("Relative path inside the skill directory. Omit for SKILL.md."),
    },
    implementation: async ({ skill_name, file_path }, { status }) =>
      withToolLogging(ctl, "read_skill_file", { skill_name, file_path }, TOOL_READ_SKILL_FILE_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "read_skill_file", toolSignal, { status });
        const normalizedRequest = normalizeReadSkillFileRequest(skill_name, file_path);
        if (normalizedRequest.note) {
          logDiagnostic({
            event: "read_skill_file_request_normalized",
            requestId,
            tool: "read_skill_file",
            requestedSkill: skill_name,
            requestedFilePath: file_path,
            normalizedSkill: normalizedRequest.skillName,
            normalizedFilePath: normalizedRequest.filePath,
            note: normalizedRequest.note,
          });
        }
        const normalizedSkillName = normalizedRequest.skillName;
        const normalizedFilePath = normalizedRequest.filePath;
        status(`Reading ${normalizedSkillName}${normalizedFilePath ? ` / ${normalizedFilePath}` : ""}..`);

        if (
          normalizedSkillName.startsWith("WSL:") ||
          normalizedSkillName.startsWith("Windows:") ||
          path.isAbsolute(normalizedSkillName)
        ) {
          const result = await timedStep(
            requestId,
            "read_skill_file",
            "read_absolute_path",
            async () => readAbsolutePath(normalizedSkillName, roots, registry, toolSignal),
            { skill_name: normalizedSkillName, file_path: normalizedFilePath },
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
          async () => resolveSkillByName(roots, registry, normalizedSkillName, toolSignal),
          { skill_name: normalizedSkillName, rootCount: roots.length },
        );

        if (!skill) {
          const suggestions = await timedStep(
            requestId,
            "read_skill_file",
            "suggest_skill_candidates",
            async () => suggestSkillsForQuery(roots, registry, normalizedSkillName, 8, toolSignal),
            { skill_name: normalizedSkillName, rootCount: roots.length },
          );
          logDiagnostic({
            event: "skill_not_found",
            requestId,
            tool: "read_skill_file",
            skill_name: normalizedSkillName,
            rootCount: roots.length,
            suggestions: suggestions.map((candidate) => candidate.skill.name).join(",") || "-",
          });
          return {
            success: false,
            error: `Skill "${normalizedSkillName}" not found.`,
            hint: suggestions.length > 0
              ? "Use one of the suggested exact skill names, then call read_skill_file again."
              : "Call list_skills with a broader query to see available skills.",
            skillStructureHint: SKILL_STRUCTURE_HINT,
            suggestions: suggestions.map(skillCandidateResult),
          };
        }

        logDiagnostic({
          event: "skill_resolved",
          requestId,
          tool: "read_skill_file",
          requestedSkill: normalizedSkillName,
          resolvedSkill: skill.name,
          environment: skill.environment,
          resolvedDirectoryPath: skill.resolvedDirectoryPath,
          resolvedSkillMdPath: skill.resolvedSkillMdPath,
        });

        const result = await timedStep(
          requestId,
          "read_skill_file",
          "read_skill_file_content",
          async () => readSkillFile(skill, normalizedFilePath, registry, toolSignal),
          { skill: skill.name, file_path: normalizedFilePath || "SKILL.md", environment: skill.environment },
        );
        if ("error" in result) return { success: false, skill: normalizedSkillName, error: result.error };

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
          filePath: normalizedFilePath || "SKILL.md",
          resolvedPath: result.resolvedPath,
          displayPath: `${skill.environment === "wsl" ? "WSL" : "Windows"}:${result.resolvedPath}`,
          content: result.content,
          hasExtraFiles: skill.hasExtraFiles,
          frontmatter: skillFrontmatterSummary(skill),
          skillStructureHint: SKILL_STRUCTURE_HINT,
          ...(skill.hasExtraFiles
            ? { hint: "This skill has additional files. Call list_skill_files to explore references/templates/examples/scripts, then read needed relative paths with read_skill_file(file_path)." }
            : {}),
        };
      }, { ui: { status } }),
  });

  const listSkillFilesTool = tool({
    name: "list_skill_files",
    description:
      "List the relative file tree inside a skill directory so the model can discover supporting assets referenced by SKILL.md. Typical skill children include references/, templates/, examples/, scripts/, and other relative files. After listing, read a needed support file with read_skill_file using the exact skill name and the returned relative path as file_path.",
    parameters: {
      skill_name: skillNameSchema.describe("Skill name or absolute/display path."),
      sub_path: optionalRelativeSkillPathSchema.describe("Optional relative sub-path within the skill directory."),
    },
    implementation: async ({ skill_name, sub_path }, { status }) =>
      withToolLogging(ctl, "list_skill_files", { skill_name, sub_path }, TOOL_LIST_SKILL_FILES_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "list_skill_files", toolSignal, { status });
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
            skillStructureHint: SKILL_STRUCTURE_HINT,
            readHint: "Read a needed support file with read_skill_file using the returned relative path as file_path.",
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
          const suggestions = await timedStep(
            requestId,
            "list_skill_files",
            "suggest_skill_candidates",
            async () => suggestSkillsForQuery(roots, registry, skill_name, 8, toolSignal),
            { skill_name, rootCount: roots.length },
          );
          logDiagnostic({
            event: "skill_not_found",
            requestId,
            tool: "list_skill_files",
            skill_name,
            rootCount: roots.length,
            suggestions: suggestions.map((candidate) => candidate.skill.name).join(",") || "-",
          });
          return {
            success: false,
            error: `Skill "${skill_name}" not found.`,
            hint: suggestions.length > 0
              ? "Use one of the suggested exact skill names, then call list_skill_files again."
              : "Call list_skills with a broader query to see available skills.",
            skillStructureHint: SKILL_STRUCTURE_HINT,
            suggestions: suggestions.map(skillCandidateResult),
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
          skillStructureHint: SKILL_STRUCTURE_HINT,
          readHint: "Read a needed support file with read_skill_file using this exact skill name and the returned relative path as file_path.",
          entries: entries.map((e) => ({
            name: e.name,
            path: e.relativePath,
            type: e.type,
            environment: e.environment,
            ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
          })),
        };
      }, { ui: { status } }),
  });

  const listSkillRootsTool = tool({
    name: "list_skill_roots",
    description:
      "List the bounded directory tree under configured skill roots so the model can inspect custom or nested skill collections when list_skills cannot find an expected skill. Use this for structural discovery only; after locating a candidate directory with SKILL.md, call list_skills or read_skill_file with the exact skill name or display path. This tool does not use shell commands and only reads inside configured skill roots.",
    parameters: {
      root_index: z.number().int().min(0).optional().describe("Optional zero-based index of a configured skill root to inspect. Omit to inspect all configured roots."),
      sub_path: optionalRelativeSkillPathSchema.describe("Optional relative sub-path inside the selected configured root, such as PROMPTS."),
    },
    implementation: async ({ root_index, sub_path }, { status }) =>
      withToolLogging(ctl, "list_skill_roots", { root_index, sub_path }, TOOL_LIST_SKILL_FILES_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "list_skill_roots", toolSignal, { status });
        status(sub_path ? `Inspecting skill roots under ${sub_path}..` : "Inspecting configured skill roots..");

        const selectedRoots = root_index === undefined ? roots : roots[root_index] ? [roots[root_index]] : [];
        if (selectedRoots.length === 0) {
          return {
            success: false,
            error: root_index === undefined
              ? "No configured skill roots were resolved."
              : `No configured skill root exists at index ${root_index}.`,
            skillsEnvironment: cfg.skillsEnvironment,
            roots,
            hint: "Check plugin skill path settings, then call list_skill_roots again.",
          };
        }

        const rootTrees = [];
        for (const root of selectedRoots) {
          const resolvedPath = joinRootSubPath(root, sub_path);
          const displayPath = `${root.environmentLabel}:${resolvedPath}`;
          const entries = await timedStep(
            requestId,
            "list_skill_roots",
            "list_configured_skill_root",
            async () => listAbsoluteDirectory(displayPath, roots, registry, toolSignal),
            { root: root.displayPath, displayPath, sub_path },
          );
          rootTrees.push({
            rootIndex: roots.indexOf(root),
            environment: root.environment,
            rawPath: root.rawPath,
            resolvedPath,
            displayPath,
            entryCount: entries.length,
            tree: formatDirEntries(entries, path.basename(resolvedPath) || resolvedPath),
            entries: entries.map((e) => ({
              name: e.name,
              path: e.relativePath,
              type: e.type,
              environment: e.environment,
              displayPath: e.displayPath,
              ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
            })),
          });
        }

        const discoveredSkillEntrypoints = rootTrees.flatMap((tree) =>
          tree.entries
            .filter((entry) => entry.type === "file" && entry.name === "SKILL.md")
            .map((entry) => skillEntrypointFollowup({
              rootIndex: tree.rootIndex,
              environment: tree.environment,
              path: entry.path,
              displayPath: entry.displayPath,
            })),
        );

        logDiagnostic({
          event: "list_skill_roots_result",
          requestId,
          tool: "list_skill_roots",
          rootCount: rootTrees.length,
          entryCount: rootTrees.reduce((sum, tree) => sum + tree.entryCount, 0),
          skillEntrypointCount: discoveredSkillEntrypoints.length,
          sub_path: sub_path || undefined,
        });

        return {
          success: true,
          skillsEnvironment: cfg.skillsEnvironment,
          roots,
          inspectedRootCount: rootTrees.length,
          skillEntrypointCount: discoveredSkillEntrypoints.length,
          discoveredSkillEntrypoints,
          rootTrees,
          skillStructureHint: SKILL_STRUCTURE_HINT,
          nextStep: discoveredSkillEntrypoints.length > 0
            ? "Use a discovered entrypoint's readSkillFileArgs exactly with read_skill_file. Do not pass the discovered SKILL.md path as file_path; omit file_path to read SKILL.md."
            : "No SKILL.md entrypoints were visible within the bounded tree. Try a narrower sub_path if the configured root is large, or check whether the configured path points at the intended collection.",
        };
      }, { ui: { status } }),
  });

  const searchSkillRootsTool = tool({
    name: "search_skill_roots",
    description:
      "Search configured skill-root directory trees by simple substring or glob-like pattern without shell commands or file-content reads. Use this for lightweight problem-solving when list_skills misses an expected skill and a full tree is too much. Examples: 'example-skill', '**/example-skill/**', 'PROMPTS/**/SKILL.md'. Results are bounded and only include entries inside configured skill roots.",
    parameters: {
      pattern: skillRootSearchPatternSchema.describe("Substring or glob-like path pattern to match against relative paths under configured skill roots."),
      root_index: z.number().int().min(0).optional().describe("Optional zero-based index of a configured skill root to search. Omit to search all configured roots."),
      sub_path: optionalRelativeSkillPathSchema.describe("Optional relative sub-path inside the selected configured root, such as PROMPTS."),
      limit: skillRootSearchLimitSchema,
    },
    implementation: async ({ pattern, root_index, sub_path, limit }, { status }) =>
      withToolLogging(ctl, "search_skill_roots", { pattern, root_index, sub_path, limit }, TOOL_LIST_SKILL_FILES_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "search_skill_roots", toolSignal, { status });
        const selectedRoots = root_index === undefined ? roots : roots[root_index] ? [roots[root_index]] : [];
        const cap = limit ?? SKILL_ROOT_SEARCH_DEFAULT_LIMIT;

        if (selectedRoots.length === 0) {
          return {
            success: false,
            error: root_index === undefined
              ? "No configured skill roots were resolved."
              : `No configured skill root exists at index ${root_index}.`,
            skillsEnvironment: cfg.skillsEnvironment,
            roots,
            hint: "Call list_skill_roots to inspect available root indexes, or check plugin skill path settings.",
          };
        }

        status(`Searching skill roots for ${pattern}..`);
        const rootResults = [];
        const matches = [];

        for (const root of selectedRoots) {
          const resolvedPath = joinRootSubPath(root, sub_path);
          const displayPath = `${root.environmentLabel}:${resolvedPath}`;
          const entries = await timedStep(
            requestId,
            "search_skill_roots",
            "list_configured_skill_root_for_search",
            async () => listAbsoluteDirectory(displayPath, roots, registry, toolSignal),
            { root: root.displayPath, displayPath, pattern, sub_path },
          );
          const rootMatches = entries.filter((entry) => entryMatchesSkillRootSearch(entry, pattern));
          const remaining = Math.max(0, cap - matches.length);
          const limitedRootMatches = rootMatches.slice(0, remaining);
          const mappedMatches = limitedRootMatches.map((entry) => ({
            rootIndex: roots.indexOf(root),
            environment: root.environment,
            name: entry.name,
            path: entry.relativePath,
            type: entry.type,
            displayPath: entry.displayPath,
            ...(entry.sizeBytes !== undefined ? { sizeBytes: entry.sizeBytes } : {}),
          }));
          matches.push(...mappedMatches);
          rootResults.push({
            rootIndex: roots.indexOf(root),
            environment: root.environment,
            rawPath: root.rawPath,
            resolvedPath,
            displayPath,
            scannedEntryCount: entries.length,
            matchedEntryCount: rootMatches.length,
          });
          if (matches.length >= cap) break;
        }

        const discoveredSkillEntrypoints = matches
          .filter((entry) => entry.type === "file" && entry.name === "SKILL.md")
          .map((entry) => skillEntrypointFollowup({
            rootIndex: entry.rootIndex,
            environment: entry.environment,
            path: entry.path,
            displayPath: entry.displayPath,
          }));

        const totalMatchedEntries = rootResults.reduce((total, rootResult) => total + rootResult.matchedEntryCount, 0);
        logDiagnostic({
          event: "search_skill_roots_result",
          requestId,
          tool: "search_skill_roots",
          pattern,
          rootCount: rootResults.length,
          returned: matches.length,
          totalMatchedEntries,
          skillEntrypointCount: discoveredSkillEntrypoints.length,
          sub_path: sub_path || undefined,
        });

        return {
          success: true,
          pattern,
          skillsEnvironment: cfg.skillsEnvironment,
          rootCount: rootResults.length,
          returned: matches.length,
          totalMatchedEntries,
          limit: cap,
          truncated: totalMatchedEntries > matches.length,
          roots: rootResults,
          matches,
          skillEntrypointCount: discoveredSkillEntrypoints.length,
          discoveredSkillEntrypoints,
          skillStructureHint: SKILL_STRUCTURE_HINT,
          nextStep: discoveredSkillEntrypoints.length > 0
            ? "Use a discovered entrypoint's readSkillFileArgs exactly with read_skill_file. Do not pass the discovered SKILL.md path as file_path; omit file_path to read SKILL.md."
            : "Try another concise substring or glob-like pattern, or call list_skill_roots to inspect nearby directory structure.",
        };
      }, { ui: { status } }),
  });

  const readFileTool = tool({
    name: "read_file",
    description:
      "Read a UTF-8 text file inside the configured skills sandbox. Accepts an absolute path or environment-prefixed display path such as WSL:/path. This is for authorized workflow file reads, not broad filesystem exploration; paths outside configured skill roots are rejected.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
    },
    implementation: async ({ file_path }, { status }) =>
      withToolLogging(ctl, "read_file", { file_path }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "read_file", toolSignal, { status });
        status(`Reading ${file_path}..`);
        const result = await timedStep(
          requestId,
          "read_file",
          "read_file_within_roots",
          async () => readFileWithinRoots(file_path, roots, registry, toolSignal),
          { file_path, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_read_result",
          requestId,
          tool: "read_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          contentLength: result.content.length,
          sizeBytes: result.sizeBytes,
        });
        return {
          success: true,
          environment: result.environment,
          filePath: result.resolvedPath,
          displayPath: result.displayPath,
          sizeBytes: result.sizeBytes,
          content: result.content,
        };
      }, { ui: { status } }),
  });

  const writeFileTool = tool({
    name: "write_file",
    description:
      "Write or replace a UTF-8 text file inside the configured skills sandbox. Mutating file access requires Command Execution Safety = Guarded as an explicit authorization signal. Paths outside configured skill roots are rejected. Set overwrite=true to replace an existing file.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
      content: fileContentSchema.describe("UTF-8 text content to write."),
      overwrite: z.boolean().optional().describe("Whether to overwrite an existing file. Defaults to false."),
    },
    implementation: async ({ file_path, content, overwrite }, { status }) =>
      withToolLogging(ctl, "write_file", { file_path, overwrite, contentBytes: Buffer.byteLength(content, "utf-8") }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "write_file", toolSignal, { status });
        if (cfg.commandExecutionMode !== "guarded") {
          logDiagnostic({ event: "file_write_blocked", requestId, tool: "write_file", reason: "mutations_require_guarded_mode", mode: cfg.commandExecutionMode });
          return {
            success: false,
            blocked: true,
            error: "File writes require Command Execution Safety = Guarded.",
            hint: "Keep this disabled unless you intentionally authorize model-driven file mutation inside configured skill roots.",
          };
        }
        status(`Writing ${file_path}..`);
        const result = await timedStep(
          requestId,
          "write_file",
          "write_file_within_roots",
          async () => writeFileWithinRoots(file_path, content, roots, registry, { overwrite: overwrite === true }, toolSignal),
          { file_path, overwrite: overwrite === true, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_write_result",
          requestId,
          tool: "write_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          bytesWritten: result.bytesWritten,
          created: result.created,
        });
        return { success: true, ...result };
      }, { ui: { status } }),
  });

  const editFileTool = tool({
    name: "edit_file",
    description:
      "Replace exact text in a UTF-8 text file inside the configured skills sandbox. Mutating file access requires Command Execution Safety = Guarded. Use expected_replacements to prevent accidental broad edits; paths outside configured skill roots are rejected.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
      old_text: editOldTextSchema.describe("Exact text to replace."),
      new_text: editNewTextSchema.describe("Replacement text."),
      expected_replacements: z.number().int().min(1).max(1_000).optional().describe("Optional exact number of replacements required."),
    },
    implementation: async ({ file_path, old_text, new_text, expected_replacements }, { status }) =>
      withToolLogging(ctl, "edit_file", { file_path, oldTextBytes: Buffer.byteLength(old_text, "utf-8"), newTextBytes: Buffer.byteLength(new_text, "utf-8"), expected_replacements }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "edit_file", toolSignal, { status });
        if (cfg.commandExecutionMode !== "guarded") {
          logDiagnostic({ event: "file_edit_blocked", requestId, tool: "edit_file", reason: "mutations_require_guarded_mode", mode: cfg.commandExecutionMode });
          return {
            success: false,
            blocked: true,
            error: "File edits require Command Execution Safety = Guarded.",
            hint: "Keep this disabled unless you intentionally authorize model-driven file mutation inside configured skill roots.",
          };
        }
        status(`Editing ${file_path}..`);
        const result = await timedStep(
          requestId,
          "edit_file",
          "edit_file_within_roots",
          async () => editFileWithinRoots(file_path, old_text, new_text, roots, registry, { expectedReplacements: expected_replacements }, toolSignal),
          { file_path, expected_replacements, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_edit_result",
          requestId,
          tool: "edit_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          replacements: result.replacements,
          bytesWritten: result.bytesWritten,
        });
        return { success: true, ...result };
      }, { ui: { status } }),
  });

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
