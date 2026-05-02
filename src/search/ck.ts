import { checkAbort } from "../abort";
import type { RuntimeRegistry } from "../runtime";
import type { ResolvedSkillRoot } from "../pathResolver";
import type { EnhancedSkillSearchOptions, EnhancedSearchBackendResult } from "./types";
import { runFixedCommand, sanitizeExecutable } from "./command";
import { parseJsonCandidates, parseTextCandidatePaths, resolveCandidatePaths } from "./candidates";

export async function runCkSearch(
  roots: ResolvedSkillRoot[],
  registry: RuntimeRegistry,
  query: string,
  limit: number,
  options: EnhancedSkillSearchOptions,
  signal?: AbortSignal,
): Promise<EnhancedSearchBackendResult> {
  const diagnostics: string[] = [];
  const allCandidates: string[] = [];

  const ckExecutable = sanitizeExecutable(options.ckExecutable, "ck");
  for (const root of roots) {
    checkAbort(signal);
    const result = await runFixedCommand(ckExecutable, ["--jsonl", "--hybrid", "--rerank", "--topk", String(Math.max(limit, 10)), "--scores", query, root.resolvedPath], signal, root.resolvedPath);
    if (result.timedOut) {
      diagnostics.push(`ck timed out for ${root.displayPath}`);
      continue;
    }
    if (result.exitCode !== 0) {
      diagnostics.push(`ck failed for ${root.displayPath}: ${result.stderr.slice(0, 160)}`);
      continue;
    }
    allCandidates.push(...parseJsonCandidates(result.stdout), ...parseTextCandidatePaths(result.stdout));
  }

  const candidates = [...new Set(allCandidates)];
  const skills = await resolveCandidatePaths(roots, registry, candidates, limit, signal);
  diagnostics.push(`ck returned ${candidates.length} path candidate(s), resolved ${skills.length} skill(s)`);
  return { skills, rawResultCount: candidates.length, diagnostics };
}
