import * as path from "path";
import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { TOOL_LIST_SKILL_FILES_TIMEOUT_MS } from "../constants";
import { listAbsoluteDirectory } from "../scanner";
import { logDiagnostic, timedStep } from "../diagnostics";
import { optionalRelativeSkillPathSchema } from "../toolSchemas";
import type { PluginController } from "../pluginTypes";
import { withToolLogging } from "./toolsProviderLogging";
import {
  SKILL_ROOT_SEARCH_DEFAULT_LIMIT,
  SKILL_STRUCTURE_HINT,
  entryMatchesSkillRootSearch,
  formatDirEntries,
  getRuntimeContext,
  joinRootSubPath,
  parentSkillReferenceForRootEntry,
  skillEntrypointFollowup,
  skillRootSearchLimitSchema,
  skillRootSearchPatternSchema,
} from "./toolsProviderShared";

export function createSkillRootTools(ctl: PluginController) {
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

        const enrichedMatches = await Promise.all(matches.map(async (entry) => ({
          ...entry,
          parentSkill: entry.name === "SKILL.md" ? undefined : await parentSkillReferenceForRootEntry(entry, roots, registry, toolSignal),
        })));
        const parentSkillCount = enrichedMatches.filter((entry) => entry.parentSkill).length;

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
          parentSkillCount,
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
          matches: enrichedMatches,
          skillEntrypointCount: discoveredSkillEntrypoints.length,
          parentSkillCount,
          discoveredSkillEntrypoints,
          skillStructureHint: SKILL_STRUCTURE_HINT,
          nextStep: discoveredSkillEntrypoints.length > 0
            ? "Use a discovered entrypoint's readSkillFileArgs exactly with read_skill_file. Do not pass the discovered SKILL.md path as file_path; omit file_path to read SKILL.md."
            : parentSkillCount > 0
              ? "Matched entries are inside existing parent skills. Use each match's parentSkill.listSkillFilesArgs or parentSkill.readSkillFileArgs; do not call list_skill_files with the matched subdirectory path as skill_name."
              : "Try another concise substring or glob-like pattern, or call list_skill_roots to inspect nearby directory structure.",
        };
      }, { ui: { status } }),
  });


  return { listSkillRootsTool, searchSkillRootsTool };
}
