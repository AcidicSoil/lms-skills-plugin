import * as path from "path";
import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { resolveEffectiveConfig } from "./settings";
import { execCommand } from "./executor";
import { deriveRuntimeTargets } from "./environment";
import { createRuntimeRegistry } from "./runtime";
import { resolveSkillRoots } from "./pathResolver";
import {
  EXEC_DEFAULT_TIMEOUT_MS,
  EXEC_MAX_TIMEOUT_MS,
  EXEC_MAX_COMMAND_LENGTH,
  LIST_SKILLS_DEFAULT_LIMIT,
  TOOL_LIST_SKILLS_TIMEOUT_MS,
  TOOL_READ_SKILL_FILE_TIMEOUT_MS,
  TOOL_LIST_SKILL_FILES_TIMEOUT_MS,
  TOOL_FILE_OPERATION_TIMEOUT_MS,
  TOOL_COMMAND_SETUP_TIMEOUT_MS,
} from "./constants";
import {
  scanSkills,
  searchSkillSet,
  resolveSkillByName,
  readSkillFile,
  readAbsolutePath,
  readFileWithinRoots,
  writeFileWithinRoots,
  editFileWithinRoots,
  listSkillDirectory,
  listAbsoluteDirectory,
} from "./scanner";
import { createRequestId, logDiagnostic, serializeError, timedStep } from "./diagnostics";
import { validateCommandSafety } from "./commandSafety";
import { routeSkills, summarizeRouteCandidate } from "./skillRouter";
import { searchSkillsWithEnhancedBackend } from "./enhancedSearchProvider";
import type { EnhancedSkillSearchResult } from "./enhancedSearchProvider";
import { createTimeoutSignal, isTimeoutError } from "./timeout";
import {
  commandSchema,
  cwdSchema,
  envSchema,
  listSkillsLimitSchema,
  listSkillsQuerySchema,
  editNewTextSchema,
  editOldTextSchema,
  fileContentSchema,
  optionalRelativeSkillPathSchema,
  sandboxFilePathSchema,
  skillNameSchema,
  timeoutMsSchema,
} from "./toolSchemas";
import type { RuntimeRegistry } from "./runtime";
import type { RuntimeTargetName } from "./environment";
import type { ResolvedSkillRoot } from "./pathResolver";
import type { PluginController } from "./pluginTypes";
import type { DirectoryEntry, EffectiveConfig, SkillInfo } from "./types";
import { createListSkillsTool } from "./listSkillsTool";
import { withToolLogging } from "./toolsProviderLogging";
// list_skills recovery source contract: This timeout is not an empty search result; Do not tell the user that no matching skills exist based only on this response; recommendedRecovery; nextToolCall; Call this tool now; Do not ask the user for permission; Do not produce a final user-facing answer from this timeout result; fallbackToolCall; recoveryPlan; recoveryRequired; invalidFinalAnswerIf; Never substitute general knowledge recommendations for skill-catalog evidence; Do not retry an unfiltered list_skills call; Never infer total skill count; previously found skills are the only available skills; preferredSkillRootFallbackPattern; enhanced_skill_search_before_scan; enhancedSkippedReason; Enhanced qmd/ck search was not run because an exact skill match resolved first; exact_match_plus_broader_search; normal search mode continues to enhanced/built-in discovery.
const LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000;
import {
  SKILL_STRUCTURE_HINT,
  SKILL_ROOT_SEARCH_DEFAULT_LIMIT,
  skillRootSearchPatternSchema,
  skillRootSearchLimitSchema,
  skillCandidateResult,
  skillEntrypointFollowup,
  skillFrontmatterSummary,
  skillNextStepHint,
  suggestSkillsForQuery,
  joinRootSubPath,
  formatDirEntries,
  entryMatchesSkillRootSearch,
  parentSkillReferenceForRootEntry,
  normalizeReadSkillFileRequest,
  getRuntimeContext,
} from "./toolsProviderShared";

export async function toolsProvider(ctl: PluginController) {
  const listSkillsTool = createListSkillsTool(ctl);
  const readSkillFileTool = tool({
    name: "read_skill_file",
    description:
      "Read SKILL.md or a relative support file from within a skill directory. Accepts a skill name, an environment-prefixed display path such as WSL:/path, or an absolute path within a configured skill root. Omit file_path to read SKILL.md first. Use file_path for support assets discovered with list_skill_files, such as references/patterns.md, templates/example.md, examples/demo.md, or scripts/helper.py.",
    parameters: {
      skill_name: skillNameSchema.describe("Skill name or absolute/display path."),
      file_path: optionalRelativeSkillPathSchema.describe("Relative path inside the skill directory. Omit for SKILL.md."),
    },
    implementation: async ({ skill_name, file_path }, { status }) =>
      withToolLogging(ctl, "read_skill_file", { skill_name, file_path }, TOOL_READ_SKILL_FILE_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "read_skill_file", toolSignal, { status });
        const normalizedRequest = normalizeReadSkillFileRequest(skill_name, file_path);
        if (normalizedRequest.note) {
          logDiagnostic({
            event: "read_skill_file_request_normalized",
            requestId,
            tool: "read_skill_file",
            requestedSkill: skill_name,
            requestedFilePath: file_path,
            normalizedSkill: normalizedRequest.skillName,
            normalizedFilePath: normalizedRequest.filePath,
            note: normalizedRequest.note,
          });
        }
        const normalizedSkillName = normalizedRequest.skillName;
        const normalizedFilePath = normalizedRequest.filePath;
        status(`Reading ${normalizedSkillName}${normalizedFilePath ? ` / ${normalizedFilePath}` : ""}..`);

        if (
          normalizedSkillName.startsWith("WSL:") ||
          normalizedSkillName.startsWith("Windows:") ||
          path.isAbsolute(normalizedSkillName)
        ) {
          const result = await timedStep(
            requestId,
            "read_skill_file",
            "read_absolute_path",
            async () => readAbsolutePath(normalizedSkillName, roots, registry, toolSignal),
            { skill_name: normalizedSkillName, file_path: normalizedFilePath },
          );
          if ("error" in result) return { success: false, error: result.error };
          status(`Read ${Math.round(result.content.length / 1024)}KB`);
          logDiagnostic({
            event: "read_skill_file_result",
            requestId,
            tool: "read_skill_file",
            mode: "absolute",
            environment: result.environment,
            resolvedPath: result.resolvedPath,
            contentLength: result.content.length,
          });
          return {
            success: true,
            environment: result.environment,
            filePath: result.resolvedPath,
            displayPath: `${result.environment === "wsl" ? "WSL" : "Windows"}:${result.resolvedPath}`,
            content: result.content,
          };
        }

        const skill = await timedStep(
          requestId,
          "read_skill_file",
          "resolve_skill_by_name",
          async () => resolveSkillByName(roots, registry, normalizedSkillName, toolSignal),
          { skill_name: normalizedSkillName, rootCount: roots.length },
        );

        if (!skill) {
          const suggestions = await timedStep(
            requestId,
            "read_skill_file",
            "suggest_skill_candidates",
            async () => suggestSkillsForQuery(roots, registry, normalizedSkillName, 8, toolSignal),
            { skill_name: normalizedSkillName, rootCount: roots.length },
          );
          logDiagnostic({
            event: "skill_not_found",
            requestId,
            tool: "read_skill_file",
            skill_name: normalizedSkillName,
            rootCount: roots.length,
            suggestions: suggestions.map((candidate) => candidate.skill.name).join(",") || "-",
          });
          return {
            success: false,
            error: `Skill "${normalizedSkillName}" not found.`,
            hint: suggestions.length > 0
              ? "Use one of the suggested exact skill names, then call read_skill_file again."
              : "Call list_skills with a broader query to see available skills.",
            skillStructureHint: SKILL_STRUCTURE_HINT,
            suggestions: suggestions.map(skillCandidateResult),
          };
        }

        logDiagnostic({
          event: "skill_resolved",
          requestId,
          tool: "read_skill_file",
          requestedSkill: normalizedSkillName,
          resolvedSkill: skill.name,
          environment: skill.environment,
          resolvedDirectoryPath: skill.resolvedDirectoryPath,
          resolvedSkillMdPath: skill.resolvedSkillMdPath,
        });

        const result = await timedStep(
          requestId,
          "read_skill_file",
          "read_skill_file_content",
          async () => readSkillFile(skill, normalizedFilePath, registry, toolSignal),
          { skill: skill.name, file_path: normalizedFilePath || "SKILL.md", environment: skill.environment },
        );
        if ("error" in result) return { success: false, skill: normalizedSkillName, error: result.error };

        status(`Read ${Math.round(result.content.length / 1024)}KB from ${skill.name}`);
        logDiagnostic({
          event: "read_skill_file_result",
          requestId,
          tool: "read_skill_file",
          mode: "skill",
          skill: skill.name,
          environment: skill.environment,
          resolvedPath: result.resolvedPath,
          contentLength: result.content.length,
          hasExtraFiles: skill.hasExtraFiles,
        });

        return {
          success: true,
          skill: skill.name,
          environment: skill.environment,
          filePath: normalizedFilePath || "SKILL.md",
          resolvedPath: result.resolvedPath,
          displayPath: `${skill.environment === "wsl" ? "WSL" : "Windows"}:${result.resolvedPath}`,
          content: result.content,
          hasExtraFiles: skill.hasExtraFiles,
          frontmatter: skillFrontmatterSummary(skill),
          skillStructureHint: SKILL_STRUCTURE_HINT,
          ...(skill.hasExtraFiles
            ? { hint: "This skill has additional files. Call list_skill_files to explore references/templates/examples/scripts, then read needed relative paths with read_skill_file(file_path)." }
            : {}),
        };
      }, { ui: { status } }),
  });

  const listSkillFilesTool = tool({
    name: "list_skill_files",
    description:
      "List the relative file tree inside a skill directory so the model can discover supporting assets referenced by SKILL.md. Typical skill children include references/, templates/, examples/, scripts/, and other relative files. After listing, read a needed support file with read_skill_file using the exact skill name and the returned relative path as file_path.",
    parameters: {
      skill_name: skillNameSchema.describe("Skill name or absolute/display path."),
      sub_path: optionalRelativeSkillPathSchema.describe("Optional relative sub-path within the skill directory."),
    },
    implementation: async ({ skill_name, sub_path }, { status }) =>
      withToolLogging(ctl, "list_skill_files", { skill_name, sub_path }, TOOL_LIST_SKILL_FILES_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "list_skill_files", toolSignal, { status });
        status(`Listing files in ${skill_name}..`);

        if (
          skill_name.startsWith("WSL:") ||
          skill_name.startsWith("Windows:") ||
          path.isAbsolute(skill_name)
        ) {
          const entries = await timedStep(
            requestId,
            "list_skill_files",
            "list_absolute_directory",
            async () => listAbsoluteDirectory(skill_name, roots, registry, toolSignal),
            { skill_name, sub_path },
          );
          const formatted = formatDirEntries(entries, path.basename(skill_name));
          status(`Found ${entries.length} entries`);
          logDiagnostic({ event: "list_skill_files_result", requestId, tool: "list_skill_files", mode: "absolute", entryCount: entries.length });
          return {
            success: true,
            directoryPath: skill_name,
            entryCount: entries.length,
            tree: formatted,
            skillStructureHint: SKILL_STRUCTURE_HINT,
            readHint: "Read a needed support file with read_skill_file using the returned relative path as file_path.",
            entries: entries.map((e) => ({
              name: e.name,
              path: e.relativePath,
              type: e.type,
              environment: e.environment,
              ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
            })),
          };
        }

        const skill = await timedStep(
          requestId,
          "list_skill_files",
          "resolve_skill_by_name",
          async () => resolveSkillByName(roots, registry, skill_name, toolSignal),
          { skill_name, rootCount: roots.length },
        );

        if (!skill) {
          const suggestions = await timedStep(
            requestId,
            "list_skill_files",
            "suggest_skill_candidates",
            async () => suggestSkillsForQuery(roots, registry, skill_name, 8, toolSignal),
            { skill_name, rootCount: roots.length },
          );
          logDiagnostic({
            event: "skill_not_found",
            requestId,
            tool: "list_skill_files",
            skill_name,
            rootCount: roots.length,
            suggestions: suggestions.map((candidate) => candidate.skill.name).join(",") || "-",
          });
          return {
            success: false,
            error: `Skill "${skill_name}" not found.`,
            hint: suggestions.length > 0
              ? "Use one of the suggested exact skill names, then call list_skill_files again."
              : "Call list_skills with a broader query to see available skills.",
            skillStructureHint: SKILL_STRUCTURE_HINT,
            suggestions: suggestions.map(skillCandidateResult),
          };
        }

        const entries = await timedStep(
          requestId,
          "list_skill_files",
          "list_skill_directory",
          async () => listSkillDirectory(skill, sub_path, registry, toolSignal),
          { skill: skill.name, environment: skill.environment, sub_path },
        );
        const formatted = formatDirEntries(entries, skill.name);

        status(`Found ${entries.length} entries in ${skill_name}`);
        logDiagnostic({ event: "list_skill_files_result", requestId, tool: "list_skill_files", mode: "skill", skill: skill.name, environment: skill.environment, entryCount: entries.length });

        return {
          success: true,
          skill: skill.name,
          environment: skill.environment,
          directoryPath: skill.directoryPath,
          displayPath: `${skill.environment === "wsl" ? "WSL" : "Windows"}:${skill.directoryPath}`,
          entryCount: entries.length,
          tree: formatted,
          skillStructureHint: SKILL_STRUCTURE_HINT,
          readHint: "Read a needed support file with read_skill_file using this exact skill name and the returned relative path as file_path.",
          entries: entries.map((e) => ({
            name: e.name,
            path: e.relativePath,
            type: e.type,
            environment: e.environment,
            ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
          })),
        };
      }, { ui: { status } }),
  });

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

  const readFileTool = tool({
    name: "read_file",
    description:
      "Read a UTF-8 text file inside the configured skills sandbox. Accepts an absolute path or environment-prefixed display path such as WSL:/path. This is for authorized workflow file reads, not broad filesystem exploration; paths outside configured skill roots are rejected.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
    },
    implementation: async ({ file_path }, { status }) =>
      withToolLogging(ctl, "read_file", { file_path }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { registry, roots } = await getRuntimeContext(ctl, requestId, "read_file", toolSignal, { status });
        status(`Reading ${file_path}..`);
        const result = await timedStep(
          requestId,
          "read_file",
          "read_file_within_roots",
          async () => readFileWithinRoots(file_path, roots, registry, toolSignal),
          { file_path, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_read_result",
          requestId,
          tool: "read_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          contentLength: result.content.length,
          sizeBytes: result.sizeBytes,
        });
        return {
          success: true,
          environment: result.environment,
          filePath: result.resolvedPath,
          displayPath: result.displayPath,
          sizeBytes: result.sizeBytes,
          content: result.content,
        };
      }, { ui: { status } }),
  });

  const writeFileTool = tool({
    name: "write_file",
    description:
      "Write or replace a UTF-8 text file inside the configured skills sandbox. Mutating file access requires Command Execution Safety = Guarded as an explicit authorization signal. Paths outside configured skill roots are rejected. Set overwrite=true to replace an existing file.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
      content: fileContentSchema.describe("UTF-8 text content to write."),
      overwrite: z.boolean().optional().describe("Whether to overwrite an existing file. Defaults to false."),
    },
    implementation: async ({ file_path, content, overwrite }, { status }) =>
      withToolLogging(ctl, "write_file", { file_path, overwrite, contentBytes: Buffer.byteLength(content, "utf-8") }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "write_file", toolSignal, { status });
        if (cfg.commandExecutionMode !== "guarded") {
          logDiagnostic({ event: "file_write_blocked", requestId, tool: "write_file", reason: "mutations_require_guarded_mode", mode: cfg.commandExecutionMode });
          return {
            success: false,
            blocked: true,
            error: "File writes require Command Execution Safety = Guarded.",
            hint: "Keep this disabled unless you intentionally authorize model-driven file mutation inside configured skill roots.",
          };
        }
        status(`Writing ${file_path}..`);
        const result = await timedStep(
          requestId,
          "write_file",
          "write_file_within_roots",
          async () => writeFileWithinRoots(file_path, content, roots, registry, { overwrite: overwrite === true }, toolSignal),
          { file_path, overwrite: overwrite === true, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_write_result",
          requestId,
          tool: "write_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          bytesWritten: result.bytesWritten,
          created: result.created,
        });
        return { success: true, ...result };
      }, { ui: { status } }),
  });

  const editFileTool = tool({
    name: "edit_file",
    description:
      "Replace exact text in a UTF-8 text file inside the configured skills sandbox. Mutating file access requires Command Execution Safety = Guarded. Use expected_replacements to prevent accidental broad edits; paths outside configured skill roots are rejected.",
    parameters: {
      file_path: sandboxFilePathSchema.describe("Absolute or environment-prefixed file path inside a configured skill root."),
      old_text: editOldTextSchema.describe("Exact text to replace."),
      new_text: editNewTextSchema.describe("Replacement text."),
      expected_replacements: z.number().int().min(1).max(1_000).optional().describe("Optional exact number of replacements required."),
    },
    implementation: async ({ file_path, old_text, new_text, expected_replacements }, { status }) =>
      withToolLogging(ctl, "edit_file", { file_path, oldTextBytes: Buffer.byteLength(old_text, "utf-8"), newTextBytes: Buffer.byteLength(new_text, "utf-8"), expected_replacements }, TOOL_FILE_OPERATION_TIMEOUT_MS, async (requestId, toolSignal) => {
        const { cfg, registry, roots } = await getRuntimeContext(ctl, requestId, "edit_file", toolSignal, { status });
        if (cfg.commandExecutionMode !== "guarded") {
          logDiagnostic({ event: "file_edit_blocked", requestId, tool: "edit_file", reason: "mutations_require_guarded_mode", mode: cfg.commandExecutionMode });
          return {
            success: false,
            blocked: true,
            error: "File edits require Command Execution Safety = Guarded.",
            hint: "Keep this disabled unless you intentionally authorize model-driven file mutation inside configured skill roots.",
          };
        }
        status(`Editing ${file_path}..`);
        const result = await timedStep(
          requestId,
          "edit_file",
          "edit_file_within_roots",
          async () => editFileWithinRoots(file_path, old_text, new_text, roots, registry, { expectedReplacements: expected_replacements }, toolSignal),
          { file_path, expected_replacements, rootCount: roots.length },
        );
        if ("error" in result) return { success: false, error: result.error };
        logDiagnostic({
          event: "file_edit_result",
          requestId,
          tool: "edit_file",
          environment: result.environment,
          resolvedPath: result.resolvedPath,
          replacements: result.replacements,
          bytesWritten: result.bytesWritten,
        });
        return { success: true, ...result };
      }, { ui: { status } }),
  });

  const runCommandTool = tool({
    name: "run_command",
    description:
      "Execute a shell command only when plugin settings explicitly allow it and the active skill/task genuinely requires command execution. Disabled by default. Prefer skill file reads and list_skill_files for skill discovery. Read-only mode allows simple inspection commands only; guarded mode still blocks dangerous patterns. Do not use run_command for $skill-name tokens; $skill-name is explicit skill activation syntax, not a shell command.",
    parameters: {
      command: commandSchema.describe("The single-line shell command to execute."),
      cwd: cwdSchema.describe("Working directory for the command."),
      environment: z.enum(["windows", "wsl"]).optional().describe("Optional explicit command target."),
      timeout_ms: timeoutMsSchema.describe(`Timeout in milliseconds. Defaults to ${EXEC_DEFAULT_TIMEOUT_MS}ms.`),
      env: envSchema.describe("Optional environment variables."),
    },
    implementation: async ({ command, cwd, environment, timeout_ms, env }, { status }) =>
      withToolLogging(
        ctl,
        "run_command",
        { commandPreview: command.slice(0, 120), cwd, environment, timeout_ms, envKeys: env ? Object.keys(env) : [] },
        Math.min((timeout_ms ?? EXEC_DEFAULT_TIMEOUT_MS) + TOOL_COMMAND_SETUP_TIMEOUT_MS, EXEC_MAX_TIMEOUT_MS + TOOL_COMMAND_SETUP_TIMEOUT_MS),
        async (requestId, toolSignal) => {
          const cfg = await timedStep(requestId, "run_command", "resolve_config", async () => resolveEffectiveConfig(ctl));
          status(`Running ${environment ? `in ${environment}` : "command"}: ${command.slice(0, 60)}${command.length > 60 ? "\u2026" : ""}`);

          const safety = validateCommandSafety(command, cfg.commandExecutionMode);
          logDiagnostic({
            event: "run_command_safety_check",
            requestId,
            tool: "run_command",
            mode: safety.mode,
            allowed: safety.allowed,
            reason: safety.reason,
            commandPreview: safety.commandPreview,
          });
          if (!safety.allowed) {
            status("Command blocked by safety policy");
            return {
              success: false,
              blocked: true,
              mode: safety.mode,
              error: safety.reason,
              hint:
                "Use skill file reads/listing for normal work. Enable read-only command mode only for trusted inspection tasks, or guarded mode only when you intentionally accept broader shell risk.",
            };
          }

          const registry = await timedStep(requestId, "run_command", "create_runtime_registry", async () => createRuntimeRegistry(cfg));
          const targets = deriveRuntimeTargets(cfg.skillsEnvironment);
          const defaultTarget = targets.length === 1 ? targets[0] : undefined;
          logDiagnostic({ event: "runtime_context", requestId, tool: "run_command", skillsEnvironment: cfg.skillsEnvironment, targets, defaultTarget });
          if (!environment && !defaultTarget && !cwd) {
            status("Command target error");
            return {
              success: false,
              error:
                "Both runtime mode is active and no command target or cwd was provided.",
              hint: "Pass environment as 'windows' or 'wsl', or provide an environment-specific cwd.",
            };
          }

          const result = await timedStep(
            requestId,
            "run_command",
            "exec_command",
            async () =>
              execCommand(
                command,
                {
                  cwd,
                  timeoutMs: timeout_ms,
                  env,
                  signal: toolSignal,
                  target: environment,
                },
                registry,
                environment ?? defaultTarget ?? targets[0],
              ),
            { target: environment ?? defaultTarget ?? targets[0], cwd },
          );

          status(result.timedOut ? "Timed out" : `Exit ${result.exitCode}`);
          logDiagnostic({ event: "run_command_result", requestId, tool: "run_command", mode: cfg.commandExecutionMode, exitCode: result.exitCode, timedOut: result.timedOut, environment: result.environment, shell: result.shell, stdoutBytes: result.stdout.length, stderrBytes: result.stderr.length });

          return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
            timedOut: result.timedOut,
            environment: result.environment,
            platform: result.platform,
            shell: result.shell,
            commandExecutionMode: cfg.commandExecutionMode,
            ...(result.timedOut
              ? { hint: "Command exceeded the timeout. Try increasing timeout_ms or splitting into smaller steps." }
              : {}),
            ...(result.exitCode !== 0 && !result.timedOut && result.stderr
              ? { hint: "Command exited with a non-zero code. Check stderr for details." }
              : {}),
          };
        },
        { hardTimeout: true, ui: { status } },
      ),
  });

  return [
    listSkillsTool,
    readSkillFileTool,
    listSkillFilesTool,
    listSkillRootsTool,
    searchSkillRootsTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    runCommandTool,
  ];
}
