import { LIST_SKILLS_DEFAULT_LIMIT } from "../constants";
import { scanSkills, searchSkillSet } from "../scanner";
import { logDiagnostic, timedStep } from "../diagnostics";
import { routeSkills, summarizeRouteCandidate } from "../skillRouter";
import { searchSkillsWithEnhancedBackend } from "../enhancedSearchProvider";
import { listAllSkills } from "./listSkillsAll";
import { exactRouteResult } from "./listSkillsExactRouteResult";
import type { PluginController } from "../pluginTypes";
import {
  getRuntimeContext,
  emitToolDebugStatus,
  fuzzySkillCandidates,
  SKILL_STRUCTURE_HINT,
  resolveExactSkillQuery,
  skillSearchBackendSummary,
  skillInfoResult,
  prependExactCandidate,
  skillCandidateResult,
  skillNextStepHint,
  skillFrontmatterSummary,
} from "./toolsProviderShared";

export async function runListSkills(
  ctl: PluginController,
  args: { query?: string; limit?: number; mode?: "search" | "route" },
  requestId: string,
  toolSignal: AbortSignal,
  status: (message: string) => void,
) {
  const { query, limit, mode } = args;
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
      return exactRouteResult(trimmedQuery, exact.matchedQuery, exactSkill, cfg);
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

  const exactSkill = exact?.skill;
  if (exactSkill) {
    status(`Found exact skill ${exactSkill.name}; continuing search for additional candidates`);
    logDiagnostic({
      event: "list_skills_exact_result",
      requestId,
      tool: "list_skills",
      query: trimmedQuery,
      matchedQuery: exact.matchedQuery,
      skill: exactSkill.name,
      environment: exactSkill.environment,
      resolvedDirectoryPath: exactSkill.resolvedDirectoryPath,
      continuedSearch: true,
    });
  }

  let enhancedSearchBackend = exactSkill
    ? skillSearchBackendSummary(cfg, undefined, {
        stage: "exact_match_plus_broader_search",
        reason: "Exact skill match resolved first, but normal search mode continues to enhanced/built-in discovery for additional candidates.",
      })
    : searchBackend;
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
          qmdCollections: cfg.qmdCollections,
          qmdSearchMode: cfg.qmdSearchMode,
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
      const mergedCandidates = prependExactCandidate(exactSkill, enhanced.candidates).slice(0, cap);
      logDiagnostic({
        event: "list_skills_result",
        requestId,
        tool: "list_skills",
        total: mergedCandidates.length,
        returned: mergedCandidates.length,
        mode: "enhanced",
        query: trimmedQuery,
        backend: enhanced.active,
        requestedBackend: enhanced.requested,
        exactIncluded: exactSkill ? true : undefined,
      });
      return {
        query: trimmedQuery,
        mode: "enhanced",
        total: mergedCandidates.length,
        found: mergedCandidates.length,
        skillsEnvironment: cfg.skillsEnvironment,
        roots,
        searchBackend: enhancedSearchBackend,
        note: exactSkill
          ? `Exact skill match included first; enhanced ${enhanced.active} search also returned additional resolvable skill candidates. Pick the intended skill and call read_skill_file with its exact name.`
          : `Enhanced ${enhanced.active} search returned resolvable skill candidates before built-in filesystem scanning. Pick the intended skill and call read_skill_file with its exact name.`,
        skillStructureHint: SKILL_STRUCTURE_HINT,
        skills: mergedCandidates.map((skill, index) => skillInfoResult(
          skill,
          exactSkill && skill.resolvedDirectoryPath === exactSkill.resolvedDirectoryPath && skill.environment === exactSkill.environment
            ? 1000
            : Math.max(1, 100 - index),
          exactSkill && skill.resolvedDirectoryPath === exactSkill.resolvedDirectoryPath && skill.environment === exactSkill.environment
            ? "exact"
            : index < 3 ? "high" : "medium",
          exactSkill && skill.resolvedDirectoryPath === exactSkill.resolvedDirectoryPath && skill.environment === exactSkill.environment
            ? ["exact_skill_name_or_directory_match"]
            : [`enhanced:${enhanced.active}`],
          exactSkill && skill.resolvedDirectoryPath === exactSkill.resolvedDirectoryPath && skill.environment === exactSkill.environment
            ? "exact"
            : enhanced.active,
        )),
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
    const fuzzyWithExact = exactSkill && !fuzzy.some((candidate) => candidate.skill.environment === exactSkill.environment && candidate.skill.resolvedDirectoryPath === exactSkill.resolvedDirectoryPath)
      ? [
          {
            skill: exactSkill,
            score: 1000,
            confidence: "high" as const,
            reasons: ["exact_skill_name_or_directory_match"],
            source: "exact" as const,
          },
          ...fuzzy,
        ].slice(0, cap)
      : fuzzy;
    logDiagnostic({
      event: "list_skills_result",
      requestId,
      tool: "list_skills",
      total: fuzzyWithExact.length,
      returned: fuzzyWithExact.length,
      mode: "fuzzy",
      query: trimmedQuery,
      exactIncluded: exactSkill ? true : undefined,
    });
    return {
      query: trimmedQuery,
      mode: "fuzzy",
      total: fuzzyWithExact.length,
      found: fuzzyWithExact.length,
      skillsEnvironment: cfg.skillsEnvironment,
      roots,
      searchBackend: enhancedSearchBackend,
      note: exactSkill
        ? "Exact skill match included first, and fuzzy/built-in metadata search also ran to consider additional candidates. Pick the intended skill and call read_skill_file with its exact name."
        : "Fast fuzzy skill-name candidates matched. Pick the intended skill and call read_skill_file with its exact name.",
      skillStructureHint: SKILL_STRUCTURE_HINT,
      skills: fuzzyWithExact.map(skillCandidateResult),
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

  const scoredWithExact = exactSkill && !results.some(({ skill }) => skill.environment === exactSkill.environment && skill.resolvedDirectoryPath === exactSkill.resolvedDirectoryPath)
    ? [{ skill: exactSkill, score: 1000 }, ...results]
    : results;

  if (scoredWithExact.length === 0) {
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

  const page = scoredWithExact.slice(0, cap);
  status(`Found ${scoredWithExact.length} match${scoredWithExact.length !== 1 ? "es" : ""}`);
  logDiagnostic({
    event: "list_skills_result",
    requestId,
    tool: "list_skills",
    total: scoredWithExact.length,
    returned: page.length,
    exactIncluded: exactSkill ? true : undefined,
  });

  return {
    query: trimmedQuery,
    total: scoredWithExact.length,
    found: page.length,
    skillsEnvironment: cfg.skillsEnvironment,
    roots,
    skillStructureHint: SKILL_STRUCTURE_HINT,
    searchBackend: enhancedSearchBackend,
    note: exactSkill
      ? "Exact skill match included first, and broader discovery also ran to consider additional candidates. Pick the intended skill and call read_skill_file with its exact name."
      : results.length > cap
        ? `Showing top ${cap} of ${results.length} matches.`
        : undefined,
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

return listAllSkills(cfg, roots, registry, requestId, toolSignal, status, cap, searchBackend);
}
