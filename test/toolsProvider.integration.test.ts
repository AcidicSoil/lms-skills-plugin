import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { toolsProvider, type ToolsProviderDependencies } from "../src/toolsProvider";
import { createWorkspaceFileSystem } from "../src/workspaceFs";
import type { PluginController } from "../src/pluginTypes";
import type { WorkspaceContext } from "../src/types";

function controller(workingDirectory: string, environment: "host" | "wsl" = "host"): PluginController {
  return {
    getWorkingDirectory: () => workingDirectory,
    getPluginConfig: () => ({
      get(key: string) {
        const values: Record<string, unknown> = {
          skillsPath: "default",
          autoInject: true,
          maxSkillsInContext: 15,
          shellPath: "",
          windowsShell: "cmd",
          executionEnvironment: environment,
          wslDistribution: environment === "wsl" ? "Ubuntu" : "",
        };
        return values[key];
      },
    }),
  };
}

async function invoke(tools: Awaited<ReturnType<typeof toolsProvider>>, name: string, params: Record<string, unknown> = {}) {
  const selected = tools.find((candidate: any) => candidate.name === name) as any;
  assert.ok(selected, `Missing tool ${name}`);
  return selected.implementation(params, { status() {} });
}

test("project tools share one Host workspace while skill tools remain separate", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tools-workspace-"));
  try {
    const context: WorkspaceContext = { workspaceId: "host-id", providerWorkingDirectory: "/provider/project", executionEnvironment: "host", nativeRoot: root };
    let workspaceResolutions = 0;
    let commandCwd = "";
    const deps: ToolsProviderDependencies = {
      resolveWorkspace: async () => { workspaceResolutions += 1; return context; },
      createWorkspaceFs: (value) => createWorkspaceFileSystem(value),
      executeCommand: async (_command, options) => {
        commandCwd = options?.cwd ?? "";
        return { stdout: "ok", stderr: "", exitCode: 0, timedOut: false, shell: "/bin/sh", platform: "linux", environment: "host" };
      },
    };
    const tools = await toolsProvider(controller("/provider/project"), deps);
    await invoke(tools, "list_skills", { limit: 1 });
    assert.equal(workspaceResolutions, 0, "skill tools must not resolve project workspace");

    const inspected = await invoke(tools, "get_current_directory");
    assert.equal(inspected.workspaceId, "host-id");
    assert.equal(inspected.workspaceRoot, root);
    await invoke(tools, "write_file", { file_path: "docs/a.txt", content: "hello" });
    await invoke(tools, "patch_file", { file_path: "docs/a.txt", search_string: "hello", replace_string: "world" });
    const read = await invoke(tools, "read_file", { file_path: "docs/a.txt" });
    assert.equal(read.content, "world");
    const listed = await invoke(tools, "list_directory", { dir_path: ".", recursive: true });
    assert.equal(listed.entries.some((entry: any) => entry.path === "docs/a.txt"), true);
    await invoke(tools, "move_file", { source_path: "docs/a.txt", destination_path: "docs/b.txt" });
    await invoke(tools, "rename_file", { file_path: "docs/b.txt", new_name: "c.txt" });
    await invoke(tools, "delete_file", { file_path: "docs/c.txt" });
    await invoke(tools, "run_command", { command: "pwd" });
    assert.equal(commandCwd, root);
    assert.equal(workspaceResolutions, 1, "one lazy workspace context must be reused");
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test("WSL project tools share Linux-native workspace metadata and command cwd", async () => {
  const context: WorkspaceContext = {
    workspaceId: "wsl-id",
    providerWorkingDirectory: "C:/provider/project",
    executionEnvironment: "wsl",
    wslDistribution: "Ubuntu",
    nativeRoot: "/home/me/.lmstudio/lms-skills/workspaces/wsl-id",
  };
  const calls: string[] = [];
  const fakeFs: any = {
    resolvePath: async (value: string) => `${context.nativeRoot}/${value}`,
    writeFile: async (value: string) => { calls.push(`write:${value}`); return { path: `${context.nativeRoot}/${value}`, bytes: 1 }; },
    readFile: async (value: string) => ({ path: `${context.nativeRoot}/${value}`, content: "wsl", bytes: 3 }),
  };
  let commandCwd = "";
  const tools = await toolsProvider(controller("C:/provider/project", "wsl"), {
    resolveWorkspace: async () => context,
    createWorkspaceFs: () => fakeFs,
    executeCommand: async (_command, options) => {
      commandCwd = options?.cwd ?? "";
      return { stdout: "", stderr: "", exitCode: 0, timedOut: false, shell: "/bin/sh", platform: "windows", environment: "wsl" };
    },
  });
  await invoke(tools, "write_file", { file_path: "a.txt", content: "x" });
  const inspected = await invoke(tools, "get_current_directory");
  await invoke(tools, "run_command", { command: "pwd" });
  assert.deepEqual(calls, ["write:a.txt"]);
  assert.equal(inspected.wslDistribution, "Ubuntu");
  assert.equal(inspected.workspaceRoot, context.nativeRoot);
  assert.equal(commandCwd, context.nativeRoot);
});

test("all public tools stay aligned to the selected WSL environment", async () => {
  const context: WorkspaceContext = {
    workspaceId: "all-wsl",
    providerWorkingDirectory: "C:/provider/all-tools",
    executionEnvironment: "wsl",
    wslDistribution: "Ubuntu",
    nativeRoot: "/home/user/.lmstudio/lms-skills/workspaces/all-wsl",
  };
  const fileCalls: string[] = [];
  const commandCalls: Array<{ cwd?: string; environment?: string; distribution?: string }> = [];
  const skillCalls: string[] = [];
  const fakeFs: any = {
    resolvePath: async (value: string) => `${context.nativeRoot}/${value}`,
    readFile: async (value: string) => { fileCalls.push(`read:${value}`); return { path: `${context.nativeRoot}/${value}`, content: "x", bytes: 1 }; },
    writeFile: async (value: string) => { fileCalls.push(`write:${value}`); return { path: `${context.nativeRoot}/${value}`, bytes: 1 }; },
    patchFile: async (value: string) => { fileCalls.push(`patch:${value}`); return { path: `${context.nativeRoot}/${value}`, replacements: 1 }; },
    appendFile: async (value: string) => { fileCalls.push(`append:${value}`); return { path: `${context.nativeRoot}/${value}`, bytes: 1 }; },
    createDirectory: async (value: string) => { fileCalls.push(`mkdir:${value}`); return { path: `${context.nativeRoot}/${value}` }; },
    listDirectory: async (value: string) => { fileCalls.push(`list:${value}`); return { path: `${context.nativeRoot}/${value}`, entries: [] }; },
    deleteFile: async (value: string) => { fileCalls.push(`delete:${value}`); return { path: `${context.nativeRoot}/${value}` }; },
    moveFile: async (source: string, destination: string) => { fileCalls.push(`move:${source}->${destination}`); return { sourcePath: `${context.nativeRoot}/${source}`, destinationPath: `${context.nativeRoot}/${destination}` }; },
    renameFile: async (value: string, name: string) => { fileCalls.push(`rename:${value}->${name}`); return { sourcePath: `${context.nativeRoot}/${value}`, destinationPath: `${context.nativeRoot}/${name}` }; },
  };
  const fakeSkill = {
    name: "docx",
    description: "Documents",
    bodyExcerpt: "",
    tags: [],
    skillMdPath: "/home/user/.agents/skills/docx/SKILL.md",
    directoryPath: "/home/user/.agents/skills/docx",
    hasExtraFiles: true,
  };
  const tools = await toolsProvider(controller("C:/provider/all-tools", "wsl"), {
    resolveWorkspace: async () => context,
    createWorkspaceFs: () => fakeFs,
    createSkillStore: () => ({
      roots: ["/home/user/.agents/skills"],
      scan: async () => { skillCalls.push("scan"); return [fakeSkill]; },
      search: async () => { skillCalls.push("search"); return [{ skill: fakeSkill, score: 1 }]; },
      resolve: async () => { skillCalls.push("resolve"); return fakeSkill; },
      read: async () => { skillCalls.push("read"); return { content: "# DOCX", resolvedPath: fakeSkill.skillMdPath }; },
      list: async () => { skillCalls.push("list"); return [{ name: "SKILL.md", relativePath: "SKILL.md", type: "file", sizeBytes: 6 }]; },
    }),
    executeCommand: async (_command, options) => {
      commandCalls.push({ cwd: options?.cwd, environment: options?.executionEnvironment, distribution: options?.wslDistribution });
      return { stdout: context.nativeRoot, stderr: "", exitCode: 0, timedOut: false, shell: "/bin/sh", platform: "windows", environment: "wsl" };
    },
  });

  await invoke(tools, "list_skills");
  await invoke(tools, "read_skill_file", { skill_name: "docx" });
  await invoke(tools, "list_skill_files", { skill_name: "docx" });
  await invoke(tools, "read_file", { file_path: "a.txt" });
  await invoke(tools, "write_file", { file_path: "a.txt", content: "x" });
  await invoke(tools, "patch_file", { file_path: "a.txt", search_string: "x", replace_string: "y" });
  await invoke(tools, "append_to_file", { file_path: "a.txt", content: "z" });
  await invoke(tools, "create_directory", { dir_path: "dir" });
  await invoke(tools, "list_directory", { dir_path: "." });
  await invoke(tools, "delete_file", { file_path: "a.txt" });
  await invoke(tools, "move_file", { source_path: "a.txt", destination_path: "b.txt" });
  await invoke(tools, "rename_file", { file_path: "b.txt", new_name: "c.txt" });
  const current = await invoke(tools, "get_current_directory");
  await invoke(tools, "run_command", { command: "pwd" });

  assert.deepEqual(skillCalls, ["scan", "resolve", "read", "resolve", "list"]);
  assert.equal(fileCalls.length, 9);
  assert.equal(current.environment, "wsl");
  assert.equal(current.wslDistribution, "Ubuntu");
  assert.equal(current.workspaceRoot, context.nativeRoot);
  assert.deepEqual(commandCalls, [{ cwd: context.nativeRoot, environment: "wsl", distribution: "Ubuntu" }]);
  assert.ok(!JSON.stringify({ fileCalls, skillCalls, commandCalls, current }).includes("C:\\Users"));
});
