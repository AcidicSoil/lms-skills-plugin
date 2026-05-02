import * as path from "path";
import { tool } from "@lmstudio/sdk";
import { TOOL_LIST_SKILL_FILES_TIMEOUT_MS, TOOL_READ_SKILL_FILE_TIMEOUT_MS } from "../constants";
import { listAbsoluteDirectory, listSkillDirectory, readAbsolutePath, readSkillFile, resolveSkillByName } from "../scanner";
import { logDiagnostic, timedStep } from "../diagnostics";
import { optionalRelativeSkillPathSchema, skillNameSchema } from "../toolSchemas";
import type { PluginController } from "../pluginTypes";
import { withToolLogging } from "./toolsProviderLogging";
import {
  SKILL_STRUCTURE_HINT,
  formatDirEntries,
  getRuntimeContext,
  normalizeReadSkillFileRequest,
  skillCandidateResult,
  skillFrontmatterSummary,
  suggestSkillsForQuery,
} from "./toolsProviderShared";

export function createSkillFileTools(ctl: PluginController) {
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


  return { readSkillFileTool, listSkillFilesTool };
}
