import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { normalizePersistedSettings } from "../src/settings";
import { PUBLIC_TOOL_NAMES, toolsProvider, type ToolsProviderDependencies } from "../src/toolsProvider";
import type { PluginController } from "../src/pluginTypes";
import type { WorkspaceContext } from "../src/types";
import { createWorkspaceFileSystem } from "../src/workspaceFs";

const EXPECTED_TOOL_NAMES = [
  "list_skills", "read_skill_file", "list_skill_files", "read_file", "write_file",
  "patch_file", "append_to_file", "create_directory", "list_directory", "delete_file",
  "move_file", "rename_file", "change_directory", "get_current_directory", "run_command",
  "get_workspace_status", "list_workspaces", "add_workspace", "update_workspace",
  "set_workspaces_enabled", "switch_workspace", "delete_workspace", "restore_workspace",
  "list_workspace_approvals", "revoke_workspace_approval", "clear_workspace_approvals",
  "get_session_capability", "resume_session",
  "configure_host_workspace",
];

function controller(workingDirectory: string): PluginController {
  return {
    getWorkingDirectory: () => workingDirectory,
    getPluginConfig: () => ({
      get(key: string) {
        const values: Record<string, unknown> = {
          skillsPath: "default", autoInject: true, maxSkillsInContext: 15,
          shellPath: "", windowsShell: "cmd", executionEnvironment: "host", wslDistribution: "",
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

test("compatibility: legacy settings remain Host and public tool names are stable", async () => {
  assert.equal(normalizePersistedSettings({}).executionEnvironment, "host");
  assert.deepEqual(PUBLIC_TOOL_NAMES, EXPECTED_TOOL_NAMES);
  const tools = await toolsProvider(controller("/provider"), {
    resolveWorkspace: async () => ({ workspaceId: "id", providerWorkingDirectory: "/provider", executionEnvironment: "host", nativeRoot: os.tmpdir() }),
  });
  assert.deepEqual(tools.map((tool: any) => tool.name), EXPECTED_TOOL_NAMES);
});

test("compatibility: Host file and command lifecycle keeps required response fields", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "compat-workspace-"));
  try {
    const context: WorkspaceContext = { workspaceId: "compat", providerWorkingDirectory: "/provider", executionEnvironment: "host", nativeRoot: root };
    let skillWorkspaceResolutions = 0;
    const deps: ToolsProviderDependencies = {
      resolveWorkspace: async () => { skillWorkspaceResolutions += 1; return context; },
      createWorkspaceFs: createWorkspaceFileSystem,
      executeCommand: async (_command, options) => ({
        stdout: options?.cwd ?? "", stderr: "", exitCode: 0, timedOut: false,
        shell: "/bin/sh", platform: "linux", environment: "host",
      }),
    };
    const tools = await toolsProvider(controller("/provider"), deps);
    await invoke(tools, "list_skills", { limit: 1 });
    assert.equal(skillWorkspaceResolutions, 0);
    const write = await invoke(tools, "write_file", { file_path: "a.txt", content: "hello" });
    assert.equal(write.success, true);
    assert.equal(typeof write.filePath, "string");
    assert.equal(typeof write.bytesWritten, "number");
    const read = await invoke(tools, "read_file", { file_path: "a.txt" });
    assert.equal(read.content, "hello");
    await invoke(tools, "create_directory", { dir_path: "sub" });
    const changed = await invoke(tools, "change_directory", { dir_path: "sub" });
    assert.equal(changed.cwd, path.join(root, "sub"));
    const inspected = await invoke(tools, "get_current_directory");
    assert.equal(inspected.cwd, path.join(root, "sub"));
    const run = await invoke(tools, "run_command", { command: "pwd" });
    assert.equal(run.exitCode, 0);
    assert.equal(run.stdout, path.join(root, "sub"));
    assert.equal(run.workspaceRoot, root);
    await invoke(tools, "delete_file", { file_path: "a.txt" });
    assert.equal(skillWorkspaceResolutions, 1);
  } finally { await fs.promises.rm(root, { recursive: true, force: true }); }
});

test("compatibility: invalid command cwd fails instead of using home", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "compat-cwd-"));
  try {
    const context: WorkspaceContext = { workspaceId: "compat", providerWorkingDirectory: "/provider", executionEnvironment: "host", nativeRoot: root };
    const tools = await toolsProvider(controller("/provider"), {
      resolveWorkspace: async () => context,
      createWorkspaceFs: createWorkspaceFileSystem,
    });
    const result = await invoke(tools, "run_command", { command: "pwd", cwd: "../outside" });
    assert.equal(result.success, false);
    assert.match(result.error, /outside|escape/i);
  } finally { await fs.promises.rm(root, { recursive: true, force: true }); }
});
