import type { SkillInfo } from "../types";
import { SKILL_STRUCTURE_HINT, skillFrontmatterSummary, skillNextStepHint, skillSearchBackendSummary } from "./toolsProviderShared";

export function exactRouteResult(
  trimmedQuery: string,
  matchedQuery: string,
  exactSkill: SkillInfo,
  cfg: { qmdExecutable: string; ckExecutable: string; qmdCollections: string[]; qmdSearchMode: unknown; skillSearchBackend: unknown },
) {
  return {
    query: trimmedQuery,
    matchedQuery,
    mode: "route",
    total: 1,
    found: 1,
    threshold: 0,
    queryTokens: trimmedQuery.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    exactMatch: true,
    searchBackend: skillSearchBackendSummary(cfg as never, undefined, {
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
