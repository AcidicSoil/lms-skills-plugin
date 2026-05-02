import * as path from "path";
import { z } from "zod";
import { resolveEffectiveConfig } from "./settings";
import { deriveRuntimeTargets } from "./environment";
import { createRuntimeRegistry } from "./runtime";
import { resolveSkillRoots } from "./pathResolver";
import { scanSkills, resolveSkillByName } from "./scanner";
import { logDiagnostic, timedStep } from "./diagnostics";
import type { EnhancedSkillSearchResult } from "./enhancedSearchProvider";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeTargetName } from "./environment";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { PluginController } from "./pluginTypes";
import type { DirectoryEntry, EffectiveConfig, SkillInfo } from "./types";

export type ToolUiReporter = {
  status?: (message: string) => void;
  warn?: (message: string) => void;
};

export const SKILL_STRUCTURE_HINT =
  "A skill directory uses SKILL.md as the entrypoint. Supporting assets may live in references/, templates/, examples/, scripts/, or other relative paths. Read SKILL.md first, then call list_skill_files and read_skill_file with a relative file_path for referenced support files when needed.";

export const SKILL_SEARCH_WORKFLOW_HINT =
  "Skill workflow: if the user wrote $skill-name and the preprocessor expanded it, apply the expanded skill directly and do not rediscover it. If an explicit $skill-name was not expanded or is unresolved, call list_skills with that exact token first. If list_skills finds nothing and the user suspects a custom or nested skill collection, call search_skill_roots for likely patterns or list_skill_roots to inspect the configured skill-root tree. For normal specialized tasks, use routed candidates first; otherwise call list_skills with a concise task query. After choosing a candidate, call read_skill_file with the exact skill name. Use list_skill_files only after SKILL.md references supporting assets. Do not call qmd, ck, grep, shell commands, or run_command for skill discovery.";

export const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000;
export const SKILL_ROOT_SEARCH_DEFAULT_LIMIT = 50;
export const SKILL_ROOT_SEARCH_MAX_LIMIT = 200;
const TOOL_VISIBLE_STILL_WORKING_MS = 5_000;

export function compactToolStatusValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "-";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

export function emitToolDebugStatus(
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

export function emitToolDebugWarning(
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

export const skillRootSearchPatternSchema = z
  .string()
  .trim()
  .min(1, "Search pattern is required.")
  .max(500, "Search pattern is too long.")
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Search pattern cannot contain control characters.");

export const skillRootSearchLimitSchema = z
  .number()
  .int()
  .min(1)
  .max(SKILL_ROOT_SEARCH_MAX_LIMIT)
  .optional()
  .describe(`Maximum number of matching root entries to return. Defaults to ${SKILL_ROOT_SEARCH_DEFAULT_LIMIT}.`);

export function skillSearchBackendSummary(
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
      qmdCollections: cfg.qmdCollections,
      qmdSearchMode: cfg.qmdSearchMode,
    },
    workflowHint: SKILL_SEARCH_WORKFLOW_HINT,
  };
}

export function skillNextStepHint(skill: SkillInfo): string {
  return skill.hasExtraFiles
    ? "Call read_skill_file with this exact skill name first. If SKILL.md references support assets or more detail is needed, call list_skill_files, then read_skill_file again with the relative file_path."
    : "Call read_skill_file with this exact skill name before doing covered work.";
}

export function skillFrontmatterSummary(skill: SkillInfo): Record<string, unknown> | undefined {
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

export function exactSkillQueryCandidates(query: string): string[] {
  const trimmed = query.trim();
  const withoutSigil = trimmed.replace(/^\$+/, "").trim();
  const hyphenated = withoutSigil
    .toLowerCase()
    .split(/[^a-z0-9._-]+/)
    .filter(Boolean)
    .join("-");
  return [...new Set([trimmed, withoutSigil, hyphenated].filter(Boolean))];
}

export async function resolveExactSkillQuery(
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

export interface ToolSkillCandidate {
  skill: SkillInfo;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  source: "exact" | "fuzzy" | "tag" | "description" | "path";
}

export function compactSkillText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function skillTokens(value: string): string[] {
  return [...new Set(value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0))];
}

export function addCandidateReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

export function scoreToolSkillCandidate(query: string, skill: SkillInfo): ToolSkillCandidate {
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

export function fuzzySkillCandidates(query: string, skills: SkillInfo[], limit: number): ToolSkillCandidate[] {
  return skills
    .map((skill) => scoreToolSkillCandidate(query, skill))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit);
}

export function skillCandidateResult(candidate: ToolSkillCandidate) {
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

export function skillInfoResult(
  skill: SkillInfo,
  score: number,
  confidence: string,
  reasons: string[],
  source: string,
) {
  return {
    name: skill.name,
    description: skill.description,
    tags: skill.tags.length > 0 ? skill.tags : undefined,
    environment: skill.environment,
    skillMdPath: skill.skillMdPath,
    displayPath: skill.displayPath,
    hasExtraFiles: skill.hasExtraFiles,
    score,
    confidence,
    reasons,
    source,
    nextStep: skillNextStepHint(skill),
    frontmatter: skillFrontmatterSummary(skill),
  };
}

export function prependExactCandidate<T extends SkillInfo>(exactSkill: SkillInfo | undefined, candidates: T[]): SkillInfo[] {
  if (!exactSkill) return candidates;
  const exactKey = `${exactSkill.environment}:${exactSkill.resolvedDirectoryPath}`;
  return [
    exactSkill,
    ...candidates.filter((candidate) => `${candidate.environment}:${candidate.resolvedDirectoryPath}` !== exactKey),
  ];
}

export async function suggestSkillsForQuery(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<ToolSkillCandidate[]> {
  const skills = await scanSkills(roots, registry, signal);
  return fuzzySkillCandidates(query, skills, limit);
}

export function joinRootSubPath(root: ResolvedSkillRoot, subPath?: string): string {
  if (!subPath) return root.resolvedPath;
  return root.environment === "windows"
    ? path.win32.join(root.resolvedPath, subPath)
    : path.posix.join(root.resolvedPath, subPath);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function globPatternToRegExp(pattern: string): RegExp {
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

export function skillRootSearchVariants(pattern: string): string[] {
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

export function preferredSkillRootFallbackPattern(query: string): string {
  const variants = skillRootSearchVariants(query);
  const promptVariant = variants.find((variant) => variant === "prompt" || variant === "prompts");
  if (promptVariant) return "prompt";
  return variants.find((variant) => !["write", "writing", "craft", "crafting", "skill", "skills"].includes(variant))
    ?? variants[0]
    ?? query;
}

export function entryMatchesSkillRootSearch(entry: DirectoryEntry, pattern: string): boolean {
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

export function formatDirEntries(entries: DirectoryEntry[], rootName: string) {
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

export function dirnameForTarget(environment: RuntimeTargetName, value: string): string {
  return environment === "windows" ? path.win32.dirname(value) : path.posix.dirname(value);
}

export function basenameForTarget(environment: RuntimeTargetName, value: string): string {
  return environment === "windows" ? path.win32.basename(value) : path.posix.basename(value);
}

export function dirnameDisplayPath(displayPath: string): string {
  const parsed = displayPath.match(/^(Windows|WSL):(.*)$/);
  if (!parsed) return path.posix.dirname(displayPath);
  const label = parsed[1];
  const rawPath = parsed[2];
  const dir = label === "Windows" ? path.win32.dirname(rawPath) : path.posix.dirname(rawPath);
  return `${label}:${dir}`;
}

export function skillEntrypointFollowup(entry: {
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

export function relativeChildPath(environment: RuntimeTargetName, parent: string, child: string): string | undefined {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\.\/?/, "").replace(/\/$/, "");
  const normalizedParent = normalize(parent);
  const normalizedChild = normalize(child);
  if (normalizedChild === normalizedParent) return undefined;
  const prefix = `${normalizedParent}/`;
  return normalizedChild.startsWith(prefix) ? normalizedChild.slice(prefix.length) : undefined;
}

export function listSubPathForMatchedEntry(
  environment: RuntimeTargetName,
  skillDirectoryPath: string,
  entryPath: string,
  entryType: "file" | "directory",
): string | undefined {
  const child = relativeChildPath(environment, skillDirectoryPath, entryPath);
  if (!child) return undefined;
  if (entryType === "directory") return child;
  const dir = dirnameForTarget(environment, child);
  return dir === "." ? undefined : dir;
}

export function ancestorSkillSearchPaths(environment: RuntimeTargetName, entryPath: string, entryType: "file" | "directory"): string[] {
  const ancestors: string[] = [];
  let current = entryType === "file" ? dirnameForTarget(environment, entryPath) : entryPath;
  while (current && current !== "." && current !== "/" && current !== "\\") {
    ancestors.push(current);
    const next = dirnameForTarget(environment, current);
    if (!next || next === current || next === ".") break;
    current = next;
  }
  return ancestors;
}

export async function parentSkillReferenceForRootEntry(
  entry: {
    environment: RuntimeTargetName;
    path: string;
    type: "file" | "directory";
    displayPath?: string;
  },
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  signal?: AbortSignal,
) {
  for (const candidatePath of ancestorSkillSearchPaths(entry.environment, entry.path, entry.type)) {
    const skill = await resolveSkillByName(roots, registry, candidatePath, signal).catch(() => null);
    if (!skill) continue;
    const subPath = listSubPathForMatchedEntry(entry.environment, candidatePath, entry.path, entry.type);
    const filePath = entry.type === "file" ? relativeChildPath(entry.environment, candidatePath, entry.path) : undefined;
    return {
      name: skill.name,
      environment: skill.environment,
      skillDirectoryPath: candidatePath,
      displayPath: skill.displayPath,
      reason: `Matched path is inside parent skill "${skill.name}". Use the parent skill name, not the matched subdirectory, with list_skill_files or read_skill_file.`,
      listSkillFilesArgs: subPath
        ? { skill_name: skill.name, sub_path: subPath }
        : { skill_name: skill.name },
      ...(entry.type === "file"
        ? {
            readSkillFileArgs: {
              skill_name: skill.name,
              file_path: filePath,
            },
          }
        : {}),
    };
  }
  return undefined;
}

export function normalizeReadSkillFileRequest(skillName: string, filePath?: string): { skillName: string; filePath?: string; note?: string } {
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

export async function getRuntimeContext(
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
