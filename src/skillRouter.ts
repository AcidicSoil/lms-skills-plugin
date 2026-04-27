import * as path from "path";
import type { SkillInfo } from "./types";

export type SkillRouteSource =
  | "explicit"
  | "exact"
  | "frontmatter"
  | "lexical"
  | "tag"
  | "path";

export type SkillRouteConfidence = "high" | "medium" | "low";

export interface SkillRouteCandidate {
  skill: SkillInfo;
  score: number;
  confidence: SkillRouteConfidence;
  reasons: string[];
  source: SkillRouteSource;
}

export interface SkillRouteDecision {
  selected: SkillRouteCandidate[];
  rejected: SkillRouteCandidate[];
  bestRejected?: SkillRouteCandidate;
  threshold: number;
  queryTokens: string[];
}

const HIGH_CONFIDENCE_THRESHOLD = 70;
const MEDIUM_CONFIDENCE_THRESHOLD = 35;
const GENERIC_TERMS = new Set([
  "use",
  "using",
  "make",
  "create",
  "update",
  "fix",
  "help",
  "please",
  "task",
  "work",
  "file",
  "thing",
  "stuff",
  "this",
  "that",
  "with",
  "from",
  "into",
  "your",
  "query",
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, " ").trim();
}

function tokenize(value: string): string[] {
  const tokens = normalize(value)
    .split(/[\s._/-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !GENERIC_TERMS.has(token));
  return [...new Set(tokens)];
}

function basenameForSkill(skill: SkillInfo): string {
  const normalizedPath = skill.resolvedDirectoryPath.replace(/\\/g, "/");
  return path.posix.basename(normalizedPath);
}

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function confidenceForScore(score: number): SkillRouteConfidence {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (score >= MEDIUM_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}

function sourceForReasons(reasons: string[]): SkillRouteSource {
  if (reasons.some((r) => r.startsWith("exact:"))) return "exact";
  if (reasons.some((r) => r.startsWith("tag:"))) return "tag";
  if (reasons.some((r) => r.startsWith("frontmatter:"))) return "frontmatter";
  if (reasons.some((r) => r.startsWith("path:"))) return "path";
  return "lexical";
}

export function scoreSkillForQuery(skill: SkillInfo, query: string): SkillRouteCandidate {
  const queryNorm = normalize(query);
  const queryTokens = tokenize(query);
  const nameNorm = normalize(skill.name);
  const basenameNorm = normalize(basenameForSkill(skill));
  const descriptionNorm = normalize(skill.description);
  const pathNorm = normalize(skill.displayPath);
  const tagNorms = skill.tags.map(normalize);
  const skillNameTokens = tokenize(skill.name);
  const basenameTokens = tokenize(basenameForSkill(skill));
  const descriptionTokens = tokenize(skill.description);
  const reasons: string[] = [];
  let score = 0;

  if (queryNorm && nameNorm === queryNorm) {
    score += 100;
    addReason(reasons, `exact:name=${skill.name}`);
  }
  if (queryNorm && basenameNorm === queryNorm) {
    score += 95;
    addReason(reasons, `exact:directory=${basenameForSkill(skill)}`);
  }
  if (queryNorm && nameNorm.includes(queryNorm) && queryNorm.length >= 4) {
    score += 60;
    addReason(reasons, `lexical:name_phrase`);
  }
  if (queryNorm && descriptionNorm.includes(queryNorm) && queryNorm.length >= 8) {
    score += 45;
    addReason(reasons, `frontmatter:description_phrase`);
  }

  for (const token of queryTokens) {
    if (tagNorms.includes(token)) {
      score += 35;
      addReason(reasons, `tag:${token}`);
    }
    if (skillNameTokens.includes(token)) {
      score += 20;
      addReason(reasons, `lexical:name_token=${token}`);
    }
    if (basenameTokens.includes(token)) {
      score += 18;
      addReason(reasons, `path:directory_token=${token}`);
    }
    if (descriptionTokens.includes(token)) {
      score += 8;
      addReason(reasons, `frontmatter:description_token=${token}`);
    }
    if (pathNorm.includes(token) && token.length >= 4) {
      score += 4;
      addReason(reasons, `path:contains=${token}`);
    }
  }

  if (descriptionTokens.length <= 3 || /^(use this skill|no description available)/i.test(skill.description)) {
    score -= 8;
    addReason(reasons, "penalty:generic_description");
  }

  score = Math.max(0, Math.round(score));
  return {
    skill,
    score,
    confidence: confidenceForScore(score),
    reasons,
    source: sourceForReasons(reasons),
  };
}

export function routeSkills(
  query: string,
  skills: SkillInfo[],
  maxSelected: number,
): SkillRouteDecision {
  const threshold = MEDIUM_CONFIDENCE_THRESHOLD;
  const queryTokens = tokenize(query);
  const candidates = skills
    .filter((skill) => !skill.disableModelInvocation)
    .map((skill) => scoreSkillForQuery(skill, query))
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));

  const selected = candidates
    .filter((candidate, index) => {
      if (candidate.score >= HIGH_CONFIDENCE_THRESHOLD) return true;
      const topScore = candidates[0]?.score ?? 0;
      return candidate.score >= threshold && index < maxSelected && topScore - candidate.score <= 25;
    })
    .slice(0, maxSelected);

  const selectedKeys = new Set(
    selected.map((candidate) => `${candidate.skill.environment}:${candidate.skill.resolvedDirectoryPath}`),
  );
  const rejected = candidates.filter(
    (candidate) => !selectedKeys.has(`${candidate.skill.environment}:${candidate.skill.resolvedDirectoryPath}`),
  );

  return {
    selected,
    rejected,
    bestRejected: rejected[0],
    threshold,
    queryTokens,
  };
}

export function summarizeRouteCandidate(candidate: SkillRouteCandidate): string {
  const reasons = candidate.reasons.slice(0, 3).join(" ") || "score_only";
  return `${candidate.skill.name}:${candidate.score}:${candidate.confidence}:${reasons}`;
}
