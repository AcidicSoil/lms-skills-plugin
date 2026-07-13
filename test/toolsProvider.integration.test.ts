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
        commandCwd = options.cwd ?? "";
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
      commandCwd = options.cwd ?? "";
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
