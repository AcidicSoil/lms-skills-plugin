import { checkAbort } from "../abort";
import { ensureManagedQmdIndex, mapManagedQmdCandidatePath } from "../managedQmdIndex";
import type { RuntimeRegistry } from "../runtime";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { SkillInfo } from "../types";
import type { EnhancedSkillSearchOptions, EnhancedSearchBackendResult } from "./types";
import { ENHANCED_SEARCH_TIMEOUT_MS, runFixedCommand, sanitizeExecutable } from "./command";
import { parseJsonCandidates, parseTextCandidatePaths, resolveCandidatePaths } from "./candidates";

async function runQmdCollectionQuery(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  qmdExecutable: string,
  query: string,
  collection: string,
  limit: number,
  signal?: AbortSignal,
  cwd?: string,
  envOverrides: Record<string, string> = {},
  mapCandidate: (candidate: string) => string = (candidate) => candidate,
): Promise<EnhancedSearchBackendResult> {
  const args = ["query", "--json", "--explain", "-n", String(Math.max(limit, 10)), "--candidate-limit", "40", "-c", collection, query];
  const result = await runFixedCommand(qmdExecutable, args, signal, cwd, ENHANCED_SEARCH_TIMEOUT_MS, envOverrides);
  if (result.timedOut) return { skills: [], rawResultCount: 0, diagnostics: [`qmd collection ${collection} query timed out`] };
  if (result.exitCode !== 0) return { skills: [], rawResultCount: 0, diagnostics: [`qmd collection ${collection} query failed: ${result.stderr.slice(0, 240)}`] };
  const candidates = [...new Set([...parseJsonCandidates(result.stdout), ...parseTextCandidatePaths(result.stdout)])];
  const skills = await resolveCandidatePaths(roots, registry, candidates.map(mapCandidate), limit, signal);
  return { skills, rawResultCount: candidates.length, diagnostics: [`qmd collection ${collection} returned ${candidates.length} path candidate(s), resolved ${skills.length} skill(s)`] };
}

export async function runQmdSearch(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  options: EnhancedSkillSearchOptions,
  signal?: AbortSignal,
): Promise<EnhancedSearchBackendResult> {
  const diagnostics: string[] = [];
  const qmdExecutable = sanitizeExecutable(options.qmdExecutable, "qmd");
  const seen = new Set<string>();
  const skills: SkillInfo[] = [];
  let rawResultCount = 0;
  const includeConfigured = options.qmdSearchMode === "configured" || options.qmdSearchMode === "both";
  const includeManaged = options.qmdSearchMode === "managed" || options.qmdSearchMode === "both";

  const appendSkills = (result: { skills: SkillInfo[]; rawResultCount: number; diagnostics: string[] }) => {
    rawResultCount += result.rawResultCount;
    diagnostics.push(...result.diagnostics);
    for (const skill of result.skills) {
      const key = `${skill.environment}:${skill.resolvedDirectoryPath}`;
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push(skill);
      if (skills.length >= limit) return;
    }
  };

  if (includeConfigured) {
    if (options.qmdCollections.length === 0) diagnostics.push("qmd configured collections empty");
    for (const collection of options.qmdCollections) {
      checkAbort(signal);
      if (skills.length >= limit) break;
      appendSkills(await runQmdCollectionQuery(roots, registry, qmdExecutable, query, collection, limit, signal));
    }
  }

  if (includeManaged && skills.length < limit) {
    const managedIndex = await ensureManagedQmdIndex(roots, qmdExecutable, signal);
    diagnostics.push(`qmd managed collection=${managedIndex.collection}`);
    diagnostics.push(`qmd managed workspace=${managedIndex.workspacePath}`);
    diagnostics.push(`qmd managed sync=${managedIndex.syncMode} stale=${managedIndex.stale} updated=${managedIndex.updated} embedded=${managedIndex.embedded}`);
    diagnostics.push(...managedIndex.diagnostics);
    appendSkills(await runQmdCollectionQuery(
      roots,
      registry,
      qmdExecutable,
      query,
      managedIndex.collection,
      limit,
      signal,
      managedIndex.workspacePath,
      managedIndex.qmdEnv,
      (candidate) => mapManagedQmdCandidatePath(candidate, managedIndex),
    ));
  }

  if (!includeConfigured && !includeManaged) diagnostics.push("qmd search mode disabled all qmd sources");
  return { skills, rawResultCount, diagnostics };
}
