import type { SkillInfo } from "../types";
import { checkAbort } from "../abort";

export interface SkillSearchResult {
  skill: SkillInfo;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_/\\.,;:()\[\]{}|]+/)
    .filter((t) => t.length > 0);
}

function computeIdf(skills: SkillInfo[]): Map<string, number> {
  const docFreq = new Map<string, number>();
  const N = skills.length;

  for (const skill of skills) {
    const allTokens = new Set([
      ...tokenize(skill.name),
      ...tokenize(skill.description),
      ...tokenize(skill.bodyExcerpt),
      ...skill.tags.flatMap((t) => tokenize(t)),
    ]);
    for (const token of allTokens) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [token, df] of docFreq) {
    idf.set(token, Math.log((N + 1) / (df + 1)) + 1);
  }

  return idf;
}

function scoreToken(token: string, candidate: string): number {
  if (candidate === token) return 1.0;
  if (candidate.startsWith(token) && token.length >= 3) return 0.6;
  if (candidate.includes(token) && token.length >= 4) return 0.3;
  return 0;
}

function scoreField(
  queryTokens: string[],
  fieldTokens: string[],
  idf: Map<string, number>,
): number {
  if (queryTokens.length === 0 || fieldTokens.length === 0) return 0;

  let weightedTotal = 0;
  let weightSum = 0;

  for (const qt of queryTokens) {
    const weight = idf.get(qt) ?? 1.0;
    let best = 0;
    for (const ft of fieldTokens) {
      best = Math.max(best, scoreToken(qt, ft));
    }
    weightedTotal += best * weight;
    weightSum += weight;
  }

  if (weightSum === 0) return 0;

  const coverage = weightedTotal / weightSum;
  const density = Math.min(weightedTotal / fieldTokens.length, 1.0);
  return coverage * 0.7 + density * 0.3;
}

export function searchSkillSet(
  skills: SkillInfo[],
  query: string,
  signal?: AbortSignal,
): SkillSearchResult[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const queryLower = query.toLowerCase().trim();
  const idf = computeIdf(skills);
  const results: SkillSearchResult[] = [];

  for (const skill of skills) {
    checkAbort(signal);
    const nameLower = skill.name.toLowerCase();

    if (nameLower === queryLower) {
      results.push({ skill, score: 10.0 });
      continue;
    }

    const nameTokens = tokenize(skill.name);
    const descTokens = tokenize(skill.description);
    const bodyTokens = tokenize(skill.bodyExcerpt);

    const nameScore = scoreField(queryTokens, nameTokens, idf);
    const descScore = scoreField(queryTokens, descTokens, idf);
    const bodyScore = scoreField(queryTokens, bodyTokens, idf);

    const phraseNameBonus = nameLower.includes(queryLower) ? 0.4 : 0;
    const phraseDescBonus = skill.description.toLowerCase().includes(queryLower)
      ? 0.2
      : 0;

    let tagScore = 0;
    for (const tag of skill.tags) {
      const tagLower = tag.toLowerCase();
      if (tagLower === queryLower) {
        tagScore = Math.max(tagScore, 1.0);
      } else if (
        tagLower.includes(queryLower) ||
        queryLower.includes(tagLower)
      ) {
        tagScore = Math.max(tagScore, 0.6);
      } else {
        tagScore = Math.max(
          tagScore,
          scoreField(queryTokens, tokenize(tag), idf),
        );
      }
    }

    const score =
      nameScore * 3.0 +
      tagScore * 2.5 +
      descScore * 1.5 +
      bodyScore * 0.8 +
      phraseNameBonus +
      phraseDescBonus;

    if (score > 0.15) {
      results.push({ skill, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
