import * as path from "path";
import { scanSkills, resolveSkillByName } from "../scanner";
import type { EnhancedSkillSearchResult } from "../enhancedSearchProvider";
import type { RuntimeRegistry } from "../runtime";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { EffectiveConfig, SkillInfo } from "../types";
import { SKILL_SEARCH_WORKFLOW_HINT } from "./toolsProviderUi";

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
