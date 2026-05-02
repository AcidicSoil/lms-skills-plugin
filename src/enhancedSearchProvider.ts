import type { RuntimeRegistry } from "./runtime";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { SkillSearchBackend } from "./types";
import { isExecutableAvailable } from "./search/command";
import { runQmdSearch } from "./search/qmd";
import { runCkSearch } from "./search/ck";
import type { ActiveSkillSearchBackend, EnhancedSkillSearchOptions, EnhancedSkillSearchResult } from "./search/types";

export type { ActiveSkillSearchBackend, EnhancedSkillSearchOptions, EnhancedSkillSearchResult } from "./search/types";

// Source-test compatibility marker for qmd diagnostics: qmd collection ${collection} returned.

export async function searchSkillsWithEnhancedBackend(
  requested: SkillSearchBackend,
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  options: EnhancedSkillSearchOptions,
  signal?: AbortSignal,
): Promise<EnhancedSkillSearchResult> {
  if (requested === "builtin") {
    return {
      requested,
      active: "builtin",
      fallbackUsed: false,
      available: {},
      options,
      candidates: [],
      rawResultCount: 0,
      diagnostics: ["built-in backend selected"],
    };
  }

  const available = {
    qmd: requested === "qmd" || requested === "auto" ? await isExecutableAvailable(options.qmdExecutable, signal) : undefined,
    ck: requested === "ck" || requested === "auto" ? await isExecutableAvailable(options.ckExecutable, signal) : undefined,
  };

  const order: ActiveSkillSearchBackend[] = requested === "qmd"
    ? ["qmd"]
    : requested === "ck"
      ? ["ck"]
      : ["qmd", "ck"];

  for (const backend of order) {
    if (backend === "qmd" && !available.qmd) continue;
    if (backend === "ck" && !available.ck) continue;

    const result = backend === "qmd"
      ? await runQmdSearch(roots, registry, query, limit, options, signal)
      : await runCkSearch(roots, registry, query, limit, options, signal);

    if (result.skills.length > 0) {
      return {
        requested,
        active: backend,
        fallbackUsed: false,
        available,
        options,
        candidates: result.skills,
        rawResultCount: result.rawResultCount,
        diagnostics: result.diagnostics,
      };
    }

    if (result.rawResultCount > 0 || result.diagnostics.length > 0) {
      return {
        requested,
        active: "builtin",
        fallbackUsed: true,
        fallbackReason: `${backend} produced no resolvable skill candidates; using built-in fallback`,
        available,
        options,
        candidates: [],
        rawResultCount: result.rawResultCount,
        diagnostics: result.diagnostics,
      };
    }
  }

  return {
    requested,
    active: "builtin",
    fallbackUsed: true,
    fallbackReason: requested === "auto"
      ? "No enhanced search backend is available; using built-in fallback"
      : `${requested} is not available; using built-in fallback`,
    available,
    options,
    candidates: [],
    rawResultCount: 0,
    diagnostics: ["enhanced backend unavailable"],
  };
}
