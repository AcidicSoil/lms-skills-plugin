import * as path from "path";
import { tool } from "@lmstudio/sdk";
import { z } from "zod";
import { getPersistedSettings, resolveEffectiveConfig, updatePersistedSettings } from "./settings";
import { execCommand } from "./executor";
import {
  EXEC_DEFAULT_TIMEOUT_MS,
  EXEC_MAX_TIMEOUT_MS,
  EXEC_MAX_COMMAND_LENGTH,
  LIST_SKILLS_DEFAULT_LIMIT,
} from "./constants";
import { readAbsolutePath, listAbsoluteDirectory } from "./scanner";
import { createSkillStore, type SkillStore } from "./skillStore";
import type { PluginController } from "./pluginTypes";
import type { DirectoryEntry, EffectiveConfig, WorkspaceContext } from "./types";
import { resolveWorkspaceContext } from "./workspace";
import { createWorkspaceFileSystem, type WorkspaceFileSystem } from "./workspaceFs";
import { deriveWorkspaceStatus } from "./workspaceSelection";
import { detectWslCapability, type WslCapability } from "./wslCapability";
import { createWorkspaceBackend, type WorkspaceBackend } from "./backend";

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
  createSkillStore?: typeof createSkillStore;
  executeCommand?: typeof execCommand;
  detectWsl?: (requested?: string) => Promise<WslCapability>;
  getSettings?: typeof getPersistedSettings;
  updateSettings?: typeof updatePersistedSettings;
  createBackend?: typeof createWorkspaceBackend;
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
  "change_directory",
  "get_current_directory",
  "run_command",
  "get_workspace_status",
  "configure_host_workspace",
] as const;

export async function toolsProvider(
  ctl: PluginController,
  dependencies: ToolsProviderDependencies = {},
) {
  let workspacePromise: Promise<WorkspaceContext> | undefined;
  let backendPromise: Promise<WorkspaceBackend> | undefined;
  let workspaceFsPromise: Promise<WorkspaceFileSystem> | undefined;
  let skillStore: SkillStore | undefined;
  let activeCommandDirectory: string | undefined;

  const getSkillStore = (): SkillStore => {
    if (!skillStore) {
      const factory = dependencies.createSkillStore ?? createSkillStore;
      const cfg = resolveEffectiveConfig(ctl);
      skillStore = factory(cfg, {
        execProgram: (program, args, options) => getBackend().then((backend) =>
          backend.runProgram(program, args, { ...options, cwd: options.cwd })),
      });
    }
    return skillStore;
  };

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

  const getBackend = (): Promise<WorkspaceBackend> => {
    if (!backendPromise) {
      backendPromise = getWorkspace().then((context) =>
        (dependencies.createBackend ?? createWorkspaceBackend)(context, {
          createFileSystem: dependencies.createWorkspaceFs
            ? ((ctx) => dependencies.createWorkspaceFs!(ctx))
            : createWorkspaceFileSystem,
          executeCommand: dependencies.executeCommand,
        }));
    }
    return backendPromise;
  };

  const getWorkspaceFs = (): Promise<WorkspaceFileSystem> => {
    if (!workspaceFsPromise) workspaceFsPromise = getBackend().then((backend) => backend.fileSystem);
    return workspaceFsPromise;
  };

  const resolveCommandDirectory = async (requested?: string): Promise<string> => {
    const workspace = await getWorkspace();
    const fs = await getWorkspaceFs();
    const current = activeCommandDirectory ?? workspace.nativeRoot;
    if (!requested || requested.trim() === "") return current;
    const value = requested.trim();
    const pathApi = workspace.executionEnvironment === "wsl"
      ? path.posix
      : (/^[A-Za-z]:[\\/]/.test(workspace.nativeRoot) ? path.win32 : path.posix);
    const candidate = pathApi.isAbsolute(value) ? value : pathApi.resolve(current, value);
    return fs.resolvePath(candidate);
  };


  const config = resolveEffectiveConfig(ctl);
  const readSettings = dependencies.getSettings ?? getPersistedSettings;
  const updateSettings = dependencies.updateSettings ?? updatePersistedSettings;
  const detectWsl = dependencies.detectWsl ?? ((requested?: string) => detectWslCapability(requested));

  const getWorkspaceStatusTool = tool({
    name: "get_workspace_status",
    description: "Inspect the active chat-scoped workspace selection and WSL capability without changing configuration.",
    parameters: {},
    implementation: async () => {
      const persisted = readSettings();
      const profileId = persisted.activeWorkspaceProfileId;
      const configuredPath = config.executionEnvironment === "wsl" ? persisted.wslWorkspacePath : persisted.hostWorkspacePath;
      let exists: boolean | undefined;
      let resolvedPath = configuredPath;
      let workspaceId: string | undefined;
      try {
        const resolved = await getWorkspace();
        exists = true;
        resolvedPath ??= resolved.nativeRoot;
        workspaceId = resolved.workspaceId;
      } catch {
        exists = configuredPath ? false : undefined;
      }
      const workspace = deriveWorkspaceStatus(
        { scope: "chat", profileId, environment: config.executionEnvironment },
        persisted.workspaceProfiles ?? [],
        { configuredPath: resolvedPath, exists, configurationRequired: !resolvedPath && !profileId },
      );
      const capability = config.executionEnvironment === "wsl" ? await detectWsl(config.wslDistribution) : undefined;
      return { success: true, workspaceId, workspace, capability, globalDefaults: { hostPath: persisted.hostWorkspacePath, wslPath: persisted.wslWorkspacePath } };
    },
  });

  const refreshWslCapabilityTool = tool({
    name: "refresh_wsl_capability",
    description: "Refresh WSL executable and distribution capability without changing the selected workspace or distribution.",
    parameters: {},
    implementation: async () => ({ success: true, capability: await detectWsl(config.wslDistribution) }),
  });

  const configureHostWorkspaceTool = tool({
    name: "configure_host_workspace",
    description: "Configure the Host workspace path for the active plugin defaults. Only registered in Host mode.",
    parameters: { path: z.string().min(1), profile_name: z.string().min(1).optional() },
    implementation: async ({ path: workspacePath, profile_name }) => {
      const trimmed = workspacePath.trim();
      const current = readSettings();
      const id = current.activeWorkspaceProfileId ?? "default";
      const profiles = [...(current.workspaceProfiles ?? []).filter((item) => item.id !== id), { id, name: profile_name?.trim() || "Default workspace", hostPath: trimmed }];
      const next = updateSettings({ hostWorkspacePath: trimmed, activeWorkspaceProfileId: id, workspaceProfiles: profiles });
      workspacePromise = undefined; backendPromise = undefined; workspaceFsPromise = undefined; activeCommandDirectory = undefined;
      return { success: true, environment: "host", path: next.hostWorkspacePath, profileId: id };
    },
  });

  const configureWslWorkspaceTool = tool({
    name: "configure_wsl_workspace",
    description: "Configure the WSL workspace path and optional distribution override. Only registered in WSL mode; omit distribution to use the system default.",
    parameters: { path: z.string().min(1), distribution: z.string().optional(), profile_name: z.string().min(1).optional() },
    implementation: async ({ path: workspacePath, distribution, profile_name }) => {
      const trimmed = workspacePath.trim();
      const requested = distribution?.trim() || undefined;
      const capability = await detectWsl(requested);
      if (capability.status !== "ready") return { success: false, errorCode: capability.status, capability };
      const current = readSettings();
      const id = current.activeWorkspaceProfileId ?? "default";
      const profiles = [...(current.workspaceProfiles ?? []).filter((item) => item.id !== id), { id, name: profile_name?.trim() || "Default workspace", wslPath: trimmed }];
      const next = updateSettings({ wslWorkspacePath: trimmed, wslDistribution: requested, activeWorkspaceProfileId: id, workspaceProfiles: profiles });
      workspacePromise = undefined; backendPromise = undefined; workspaceFsPromise = undefined; activeCommandDirectory = undefined;
      return { success: true, environment: "wsl", path: next.wslWorkspacePath, distribution: capability.distribution, profileId: id };
    },
  });

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
        const results = await getSkillStore().search(query.trim());

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
      const store = getSkillStore();
      const skills = await store.scan();

      if (skills.length === 0) {
        return {
          total: 0,
          found: 0,
          skillsPaths: store.roots,
          skills: [],
          note: "No skills found. Create skill directories with a SKILL.md file inside the configured skills paths.",
        };
      }

      const page = skills.slice(0, cap);
      status(`Found ${skills.length} skill${skills.length !== 1 ? "s" : ""}`);

      return {
        total: skills.length,
        found: page.length,
        skillsPaths: store.roots,
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
      const cfg = resolveEffectiveConfig(ctl);

      if (path.isAbsolute(skill_name) && cfg.executionEnvironment === "host") {
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

      const skill = await getSkillStore().resolve(skill_name);

      if (!skill) {
        return {
          success: false,
          error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
        };
      }

      const result = await getSkillStore().read(skill, file_path);
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
      const cfg = resolveEffectiveConfig(ctl);

      if (path.isAbsolute(skill_name) && cfg.executionEnvironment === "host") {
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

      const skill = await getSkillStore().resolve(skill_name);

      if (!skill) {
        return {
          success: false,
          error: `Skill "${skill_name}" not found. Call list_skills to see available skills.`,
        };
      }

      const entries = await getSkillStore().list(skill, sub_path);
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

  const changeDirectoryTool = tool({
    name: "change_directory",
    description: "Change the active command directory inside the current Host/WSL workspace. The directory persists for subsequent run_command calls and cannot escape the workspace.",
    parameters: {
      dir_path: z.string().min(1).describe("Contained directory path. Relative paths resolve from the current active command directory."),
    },
    implementation: async ({ dir_path }, { status }) => {
      status(`Changing directory to ${dir_path}..`);
      try {
        const fs = await getWorkspaceFs();
        const resolved = await resolveCommandDirectory(dir_path);
        await fs.listDirectory(resolved, false);
        activeCommandDirectory = resolved;
        const workspace = await getWorkspace();
        return {
          success: true,
          cwd: resolved,
          workspaceRoot: workspace.nativeRoot,
          environment: workspace.executionEnvironment,
          ...(workspace.wslDistribution ? { wslDistribution: workspace.wslDistribution } : {}),
        };
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
          cwd: activeCommandDirectory ?? workspace.nativeRoot,
          note: "Project file tools remain workspace-root scoped; change_directory controls the default run_command directory.",
        };
      } catch (error) { return failure(error); }
    },
  });

  const runCommandTool = tool({
    name: "run_command",
    description: "Execute a shell command in the active per-chat workspace and selected Host/WSL environment. An optional cwd must remain inside the same workspace.",
    parameters: {
      command: z.string().min(1).max(EXEC_MAX_COMMAND_LENGTH).describe("Shell command to execute."),
      cwd: z.string().optional().describe("Optional contained directory. Relative paths resolve from the active command directory; defaults to the directory set by change_directory or the workspace root."),
      timeout_ms: z.number().int().min(1_000).max(EXEC_MAX_TIMEOUT_MS).optional().describe(`Timeout in milliseconds. Defaults to ${EXEC_DEFAULT_TIMEOUT_MS}.`),
      env: z.record(z.string()).optional().describe("Optional environment variables merged over the process environment."),
    },
    implementation: async ({ command, cwd, timeout_ms, env }, { status }) => {
      status(`${command.slice(0, 72)}${command.length > 72 ? "…" : ""}`);
      try {
        const config = resolveEffectiveConfig(ctl);
        const workspace = await getWorkspace();
        const commandCwd = await resolveCommandDirectory(cwd);
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
    changeDirectoryTool,
    getCurrentDirectoryTool,
    runCommandTool,
    getWorkspaceStatusTool,
    ...(config.executionEnvironment === "wsl" ? [configureWslWorkspaceTool, refreshWslCapabilityTool] : [configureHostWorkspaceTool]),
  ];
}
