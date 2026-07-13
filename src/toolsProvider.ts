import * as path from "path";
import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { resolveEffectiveConfig } from "./settings";
import { execCommand } from "./executor";
import {
  EXEC_DEFAULT_TIMEOUT_MS,
  EXEC_MAX_TIMEOUT_MS,
  EXEC_MAX_COMMAND_LENGTH,
  LIST_SKILLS_DEFAULT_LIMIT,
} from "./constants";
import {
  scanSkills,
  searchSkills,
  resolveSkillByName,
  readSkillFile,
  readAbsolutePath,
  listSkillDirectory,
  listAbsoluteDirectory,
} from "./scanner";
import type { PluginController } from "./pluginTypes";
import type { DirectoryEntry, EffectiveConfig, WorkspaceContext } from "./types";
import { resolveWorkspaceContext } from "./workspace";
import { createWorkspaceFileSystem, type WorkspaceFileSystem } from "./workspaceFs";

function formatDirEntries(entries: DirectoryEntry[], rootName: string): string {
  if (entries.length === 0) return "Directory is empty.";

  const lines: string[] = [`${rootName}/`];
  for (const entry of entries) {
    const depth = entry.relativePath.split(/[/\\]/).length - 1;
    const indent = "  ".repeat(depth);
    if (entry.type === "directory") {
      lines.push(`${indent}${entry.name}/`);
    } else {
      const size =
        entry.sizeBytes !== undefined
          ? entry.sizeBytes >= 1024
            ? `${Math.round(entry.sizeBytes / 1024)}K`
            : `${entry.sizeBytes}B`
          : "";
      lines.push(`${indent}${entry.name}${size ? `  (${size})` : ""}`);
    }
  }
  return lines.join("\n");
}

export interface ToolsProviderDependencies {
  resolveWorkspace?: (ctl: PluginController, config: EffectiveConfig) => Promise<WorkspaceContext>;
  createWorkspaceFs?: (context: WorkspaceContext) => WorkspaceFileSystem;
  executeCommand?: typeof execCommand;
}

export const PUBLIC_TOOL_NAMES = [
  "list_skills",
  "read_skill_file",
  "list_skill_files",
  "read_file",
  "write_file",
  "patch_file",
  "append_to_file",
  "create_directory",
  "list_directory",
  "delete_file",
  "move_file",
  "rename_file",
  "get_current_directory",
  "run_command",
] as const;

export async function toolsProvider(
  ctl: PluginController,
  dependencies: ToolsProviderDependencies = {},
) {
  let workspacePromise: Promise<WorkspaceContext> | undefined;
  let workspaceFsPromise: Promise<WorkspaceFileSystem> | undefined;

  const getWorkspace = (): Promise<WorkspaceContext> => {
    if (!workspacePromise) {
      const config = resolveEffectiveConfig(ctl);
      const resolver = dependencies.resolveWorkspace
        ?? ((controller: PluginController, cfg: EffectiveConfig) =>
          resolveWorkspaceContext(controller.getWorkingDirectory(), cfg));
      workspacePromise = resolver(ctl, config);
    }
    return workspacePromise;
  };

  const getWorkspaceFs = (): Promise<WorkspaceFileSystem> => {
    if (!workspaceFsPromise) {
      workspaceFsPromise = getWorkspace().then((context) =>
        (dependencies.createWorkspaceFs ?? createWorkspaceFileSystem)(context));
    }
    return workspaceFsPromise;
  };

  const executeCommand = dependencies.executeCommand ?? execCommand;
  const failure = (error: unknown) => ({
    success: false,
    error: error instanceof Error ? error.message : String(error),
  });
  const listSkillsTool = tool({
    name: "list_skills",
    description:
      "List or search available skills. " +
      "Without a query, returns all skills up to the limit. " +
      "With a query, scores and ranks skills by relevance across name, tags, description, and SKILL.md body content - use this to find skills relevant to a task without needing all skills in context. " +
      "Always call read_skill_file on any skill that looks relevant before starting work.",
    parameters: {
      query: z
        .string()
        .optional()
        .describe(
          "Optional search query to filter and rank skills by relevance. " +
          "Matches against skill names, tags, descriptions, and SKILL.md body using IDF-weighted token scoring, phrase proximity, and partial prefix matching. " +
          "Omit to list all skills.",
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe(
          `Maximum number of skills to return. Defaults to ${LIST_SKILLS_DEFAULT_LIMIT}. Omit the query and set a high limit to page through all installed skills.`,
        ),
    },
    implementation: async ({ query, limit }, { status }) => {
      const cfg = resolveEffectiveConfig(ctl);
      const cap = limit ?? LIST_SKILLS_DEFAULT_LIMIT;

      if (query && query.trim()) {
        status(`Searching skills for "${query.trim()}"..`);
        const results = searchSkills(cfg.skillsPaths, query.trim());

        if (results.length === 0) {
          return {
            query: query.trim(),
            found: 0,
            skills: [],
            note: "No skills matched. Try a broader query or omit the query to list all skills.",
          };
        }

        const page = results.slice(0, cap);
        status(
          `Found ${results.length} match${results.length !== 1 ? "es" : ""}`,
        );

        return {
          query: query.trim(),
          total: results.length,
          found: page.length,
          ...(results.length > cap
            ? {
              note: `Showing top ${cap} of ${results.length} matches. Refine your query or increase the limit to see more.`,
            }
            : {}),
          skills: page.map(({ skill, score }) => ({
            name: skill.name,
            description: skill.description,
            tags: skill.tags.length > 0 ? skill.tags : undefined,
            skillMdPath: skill.skillMdPath,
            hasExtraFiles: skill.hasExtraFiles,
            score: Math.round(score * 100) / 100,
          })),
        };
      }

      status("Scanning skills directory..");
      const skills = scanSkills(cfg.skillsPaths);

      if (skills.length === 0) {
        return {
          total: 0,
          found: 0,
          skillsPaths: cfg.skillsPaths,
          skills: [],
          note: "No skills found. Create skill directories with a SKILL.md file inside the configured skills paths.",
        };
      }

      const page = skills.slice(0, cap);
      status(`Found ${skills.length} skill${skills.length !== 1 ? "s" : ""}`);

      return {
        total: skills.length,
        found: page.length,
        skillsPaths: cfg.skillsPaths,
        ...(skills.length > cap
          ? {
            note: `Showing ${cap} of ${skills.length} skills. Increase the limit or use a query to find specific skills.`,
          }
          : {}),
        skills: page.map((s) => ({
          name: s.name,
          description: s.description,
          tags: s.tags.length > 0 ? s.tags : undefined,
          skillMdPath: s.skillMdPath,
          hasExtraFiles: s.hasExtraFiles,
        })),
      };
    },
  });

  const readSkillFileTool = tool({
    name: "read_skill_file",
    description:
      "Read a file from within a skill directory. " +
      "Accepts either a skill name (e.g. 'docx') or an absolute path to any file within a skill directory. " +
      "Defaults to reading the SKILL.md entry point when no file_path is given. " +
      "ALWAYS call this before starting any task the skill covers - the SKILL.md contains critical instructions built from trial and error. " +
      "Multiple skills may be relevant to a task; read all of them before proceeding.",
    parameters: {
      skill_name: z
        .string()
        .min(1)
        .describe(
          "Skill directory name (e.g. 'docx') or an absolute path to a file within a skill directory.",
        ),
      file_path: z
        .string()
        .optional()
        .describe(
          "Relative path to a file within the skill directory. Omit to read SKILL.md. " +
          "Ignored when skill_name is an absolute path.",
        ),
    },
    implementation: async ({ skill_name, file_path }, { status }) => {
      status(`Reading ${skill_name}${file_path ? ` / ${file_path}` : ""}..`);

      if (path.isAbsolute(skill_name)) {
        const cfg = resolveEffectiveConfig(ctl);
        const resolvedTarget = path.resolve(skill_name);
        const isAllowed = cfg.skillsPaths.some((p) =>
          resolvedTarget.startsWith(path.resolve(p) + path.sep),
        );
        if (!isAllowed) {
          return {
            success: false,
            error: "Path is outside the configured skills directories.",
          };
        }
        const result = readAbsolutePath(skill_name);
        if ("error" in result) return { success: false, error: result.error };
        status(`Read ${Math.round(result.content.length / 1024)}KB`);
        return {
          success: true,
          filePath: result.resolvedPath,
          content: result.content,
        };
      }

      const cfg = resolveEffectiveConfig(ctl);
      const skill = resolveSkillByName(cfg.skillsPaths, skill_name);

      if (!skill) {
        return {
          success: false,
          error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
        };
      }

      const result = readSkillFile(skill, file_path);
      if ("error" in result)
        return { success: false, skill: skill_name, error: result.error };

      status(
        `Read ${Math.round(result.content.length / 1024)}KB from ${skill_name}`,
      );

      return {
        success: true,
        skill: skill.name,
        filePath: file_path || "SKILL.md",
        resolvedPath: result.resolvedPath,
        content: result.content,
        hasExtraFiles: skill.hasExtraFiles,
        ...(skill.hasExtraFiles
          ? {
            hint: "This skill has additional files. Call list_skill_files to explore them.",
          }
          : {}),
      };
    },
  });

  const listSkillFilesTool = tool({
    name: "list_skill_files",
    description:
      "List all files inside a skill directory. " +
      "Accepts either a skill name (e.g. 'docx') or an absolute path to a skill directory. " +
      "Use this after reading SKILL.md when you need to discover additional supporting files " +
      "such as helper scripts, templates, or supplementary documentation the SKILL.md references.",
    parameters: {
      skill_name: z
        .string()
        .min(1)
        .describe(
          "Skill directory name (e.g. 'docx') or an absolute path to a skill directory.",
        ),
      sub_path: z
        .string()
        .optional()
        .describe(
          "Optional relative sub-path within the skill directory to list. Omit to list the entire skill directory.",
        ),
    },
    implementation: async ({ skill_name, sub_path }, { status }) => {
      status(`Listing files in ${skill_name}..`);

      if (path.isAbsolute(skill_name)) {
        const cfg = resolveEffectiveConfig(ctl);
        const resolvedTarget = path.resolve(skill_name);
        const isAllowed = cfg.skillsPaths.some((p) =>
          resolvedTarget.startsWith(path.resolve(p) + path.sep),
        );
        if (!isAllowed) {
          return {
            success: false,
            error: "Path is outside the configured skills directories.",
          };
        }
        const entries = listAbsoluteDirectory(skill_name);
        const formatted = formatDirEntries(entries, path.basename(skill_name));
        status(`Found ${entries.length} entries`);
        return {
          success: true,
          directoryPath: skill_name,
          entryCount: entries.length,
          tree: formatted,
          entries: entries.map((e) => ({
            name: e.name,
            path: e.relativePath,
            type: e.type,
            ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
          })),
        };
      }

      const cfg = resolveEffectiveConfig(ctl);
      const skill = resolveSkillByName(cfg.skillsPaths, skill_name);

      if (!skill) {
        return {
          success: false,
          error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
        };
      }

      const entries = listSkillDirectory(skill, sub_path);
      const formatted = formatDirEntries(entries, skill.name);

      status(`Found ${entries.length} entries in ${skill_name}`);

      return {
        success: true,
        skill: skill.name,
        directoryPath: skill.directoryPath,
        entryCount: entries.length,
        tree: formatted,
        entries: entries.map((e) => ({
          name: e.name,
          path: e.relativePath,
          type: e.type,
          ...(e.sizeBytes !== undefined ? { sizeBytes: e.sizeBytes } : {}),
        })),
      };
    },
  });

  const readFileTool = tool({
    name: "read_file",
    description: "Read a UTF-8 file from the active per-chat workspace. Relative paths resolve from the workspace root; absolute paths must be native to the selected environment and remain contained.",
    parameters: {
      file_path: z.string().min(1).describe("Workspace-relative path, or a contained absolute path native to the selected environment."),
    },
    implementation: async ({ file_path }, { status }) => {
      status(`Reading ${path.basename(file_path)}..`);
      try {
        const result = await (await getWorkspaceFs()).readFile(file_path);
        return { success: true, filePath: result.path, content: result.content };
      } catch (error) { return failure(error); }
    },
  });

  const writeFileTool = tool({
    name: "write_file",
    description: "Create or overwrite a UTF-8 file inside the active per-chat workspace. Prefer this over shell redirection.",
    parameters: {
      file_path: z.string().min(1).describe("Workspace-relative path, or a contained native absolute path."),
      content: z.string().describe("The full content to write."),
    },
    implementation: async ({ file_path, content }, { status }) => {
      status(`Writing ${path.basename(file_path)}..`);
      try {
        const result = await (await getWorkspaceFs()).writeFile(file_path, content);
        return { success: true, filePath: result.path, bytesWritten: result.bytes };
      } catch (error) { return failure(error); }
    },
  });

  const patchFileTool = tool({
    name: "patch_file",
    description: "Replace the first exact occurrence of a string in a file inside the active workspace.",
    parameters: {
      file_path: z.string().min(1).describe("Workspace-relative path, or a contained native absolute path."),
      search_string: z.string().min(1).describe("Exact string to find, including whitespace."),
      replace_string: z.string().describe("Replacement text."),
    },
    implementation: async ({ file_path, search_string, replace_string }, { status }) => {
      status(`Patching ${path.basename(file_path)}..`);
      try {
        const result = await (await getWorkspaceFs()).patchFile(file_path, search_string, replace_string);
        return { success: true, filePath: result.path, note: "Replaced first occurrence of search_string." };
      } catch (error) { return failure(error); }
    },
  });

  const appendToFileTool = tool({
    name: "append_to_file",
    description: "Append UTF-8 text to a file inside the active workspace, creating the file and parent directories when needed.",
    parameters: {
      file_path: z.string().min(1).describe("Workspace-relative path, or a contained native absolute path."),
      content: z.string().describe("Text to append."),
    },
    implementation: async ({ file_path, content }, { status }) => {
      status(`Appending to ${path.basename(file_path)}..`);
      try {
        const result = await (await getWorkspaceFs()).appendFile(file_path, content);
        return { success: true, filePath: result.path, bytesAppended: result.bytes };
      } catch (error) { return failure(error); }
    },
  });

  const createDirectoryTool = tool({
    name: "create_directory",
    description: "Create a directory and missing parents inside the active workspace. The operation is idempotent.",
    parameters: {
      dir_path: z.string().min(1).describe("Workspace-relative directory path, or a contained native absolute path."),
    },
    implementation: async ({ dir_path }, { status }) => {
      status(`Creating directory ${path.basename(dir_path)}..`);
      try {
        const result = await (await getWorkspaceFs()).createDirectory(dir_path);
        return { success: true, dirPath: result.path };
      } catch (error) { return failure(error); }
    },
  });

  const listDirectoryTool = tool({
    name: "list_directory",
    description: "List files and directories inside the active workspace. Paths cannot escape the workspace root.",
    parameters: {
      dir_path: z.string().optional().describe("Workspace-relative directory path. Defaults to the workspace root."),
      recursive: z.boolean().optional().describe("List descendants recursively, bounded by the workspace service."),
    },
    implementation: async ({ dir_path = ".", recursive = false }, { status }) => {
      status(`Listing ${dir_path}..`);
      try {
        const result = await (await getWorkspaceFs()).listDirectory(dir_path, recursive);
        const formatted = formatDirEntries(result.entries, path.basename(result.path) || "workspace");
        return {
          success: true,
          dirPath: result.path,
          entryCount: result.entries.length,
          tree: formatted,
          entries: result.entries.map((entry) => ({
            name: entry.name,
            path: entry.relativePath,
            type: entry.type,
            ...(entry.sizeBytes !== undefined ? { sizeBytes: entry.sizeBytes } : {}),
          })),
        };
      } catch (error) { return failure(error); }
    },
  });

  const deleteFileTool = tool({
    name: "delete_file",
    description: "Permanently delete a file or directory inside the active workspace. The workspace root itself cannot be deleted.",
    parameters: {
      file_path: z.string().min(1).describe("Workspace-relative path, or a contained native absolute path."),
      recursive: z.boolean().optional().describe("Delete directory contents recursively."),
    },
    implementation: async ({ file_path, recursive = false }, { status }) => {
      status(`Deleting ${path.basename(file_path)}..`);
      try {
        const result = await (await getWorkspaceFs()).deleteFile(file_path, recursive);
        return { success: true, deletedPath: result.path };
      } catch (error) { return failure(error); }
    },
  });

  const moveFileTool = tool({
    name: "move_file",
    description: "Move a file or directory between contained locations in the active workspace. Existing destinations are not overwritten.",
    parameters: {
      source_path: z.string().min(1).describe("Workspace-relative source path."),
      destination_path: z.string().min(1).describe("Workspace-relative destination path."),
    },
    implementation: async ({ source_path, destination_path }, { status }) => {
      status(`Moving ${path.basename(source_path)}..`);
      try {
        const result = await (await getWorkspaceFs()).moveFile(source_path, destination_path);
        return { success: true, sourcePath: result.source, destinationPath: result.destination };
      } catch (error) { return failure(error); }
    },
  });

  const renameFileTool = tool({
    name: "rename_file",
    description: "Rename a file or directory in place inside the active workspace.",
    parameters: {
      file_path: z.string().min(1).describe("Workspace-relative path to rename."),
      new_name: z.string().min(1).describe("New single-segment name."),
    },
    implementation: async ({ file_path, new_name }, { status }) => {
      status(`Renaming ${path.basename(file_path)} → ${new_name}..`);
      try {
        const result = await (await getWorkspaceFs()).renameFile(file_path, new_name);
        return { success: true, oldPath: result.source, newPath: result.destination };
      } catch (error) { return failure(error); }
    },
  });

  const getCurrentDirectoryTool = tool({
    name: "get_current_directory",
    description: "Inspect the deterministic per-chat workspace used by project-scoped file and shell tools.",
    parameters: {},
    implementation: async (_params, { status }) => {
      status("Resolving workspace..");
      try {
        const workspace = await getWorkspace();
        return {
          success: true,
          workspaceId: workspace.workspaceId,
          providerWorkingDirectory: workspace.providerWorkingDirectory,
          environment: workspace.executionEnvironment,
          ...(workspace.wslDistribution ? { wslDistribution: workspace.wslDistribution } : {}),
          workspaceRoot: workspace.nativeRoot,
          cwd: workspace.nativeRoot,
          note: "Project-scoped file tools and run_command use this same workspace root.",
        };
      } catch (error) { return failure(error); }
    },
  });

  const runCommandTool = tool({
    name: "run_command",
    description: "Execute a shell command in the active per-chat workspace and selected Host/WSL environment. An optional cwd must remain inside the same workspace.",
    parameters: {
      command: z.string().min(1).max(EXEC_MAX_COMMAND_LENGTH).describe("Shell command to execute."),
      cwd: z.string().optional().describe("Optional workspace-relative subdirectory. Defaults to the workspace root."),
      timeout_ms: z.number().int().min(1_000).max(EXEC_MAX_TIMEOUT_MS).optional().describe(`Timeout in milliseconds. Defaults to ${EXEC_DEFAULT_TIMEOUT_MS}.`),
      env: z.record(z.string()).optional().describe("Optional environment variables merged over the process environment."),
    },
    implementation: async ({ command, cwd, timeout_ms, env }, { status }) => {
      status(`${command.slice(0, 72)}${command.length > 72 ? "…" : ""}`);
      try {
        const config = resolveEffectiveConfig(ctl);
        const workspace = await getWorkspace();
        const commandCwd = cwd ? await (await getWorkspaceFs()).resolvePath(cwd) : workspace.nativeRoot;
        const timeoutMs = timeout_ms ?? EXEC_DEFAULT_TIMEOUT_MS;
        const result = await executeCommand(command, {
          cwd: commandCwd,
          timeoutMs,
          shellPath: config.shellPath || undefined,
          windowsShell: config.windowsShell,
          env,
          executionEnvironment: workspace.executionEnvironment,
          wslDistribution: workspace.wslDistribution,
        });
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          platform: result.platform,
          shell: result.shell,
          environment: result.environment,
          workspaceId: workspace.workspaceId,
          workspaceRoot: workspace.nativeRoot,
          ...(result.terminationIncomplete !== undefined ? { terminationIncomplete: result.terminationIncomplete } : {}),
          ...(result.timedOut ? { hint: `Command exceeded the ${timeoutMs}ms timeout.` } : {}),
        };
      } catch (error) { return failure(error); }
    },
  });

  return [
    listSkillsTool,
    readSkillFileTool,
    listSkillFilesTool,
    readFileTool,
    writeFileTool,
    patchFileTool,
    appendToFileTool,
    createDirectoryTool,
    listDirectoryTool,
    deleteFileTool,
    moveFileTool,
    renameFileTool,
    getCurrentDirectoryTool,
    runCommandTool,
  ];
}
