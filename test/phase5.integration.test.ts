import test from "node:test";
import assert from "node:assert/strict";
import { toolsProvider } from "../src/toolsProvider";
import type { PluginController } from "../src/pluginTypes";
import type { PersistedSettings } from "../src/types";

function controller(environment: "host" | "wsl", distribution = "") : PluginController {
  return {
    getWorkingDirectory: () => "/provider/project",
    getPluginConfig: () => ({
      get(key: string) {
        const values: Record<string, unknown> = {
          skillsPath: "default",
          autoInject: true,
          maxSkillsInContext: 15,
          shellPath: "",
          windowsShell: "cmd",
          executionEnvironment: environment,
          wslDistribution: distribution,
        };
        return values[key];
      },
    }),
  };
}

async function invoke(tools: any[], name: string, params: Record<string, unknown> = {}) {
  const selected = tools.find((candidate) => candidate.name === name);
  assert.ok(selected, `Missing tool ${name}`);
  return selected.implementation(params, { status() {} });
}

function settings(environment: "host" | "wsl", path: string): PersistedSettings {
  return {
    skillsPaths: [environment === "wsl" ? "/skills" : "/tmp/skills"],
    autoInject: true,
    maxSkillsInContext: 15,
    shellPath: "",
    windowsShell: "cmd",
    executionEnvironment: environment,
    activeWorkspaceProfileId: "p1",
    workspaceProfiles: [{ id: "p1", name: "Demo", ...(environment === "wsl" ? { wslPath: path } : { hostPath: path }) }],
    ...(environment === "wsl" ? { wslWorkspacePath: path } : { hostWorkspacePath: path }),
  };
}

test("invalid workspace preflight returns structured recovery before execution", async () => {
  let executions = 0;
  const tools = await toolsProvider(controller("host"), {
    getSettings: () => settings("host", "/missing/project"),
    resolveWorkspace: async () => { throw new Error("Workspace path is unavailable: /missing/project"); },
    executeCommand: async () => {
      executions += 1;
      return { stdout: "", stderr: "", exitCode: 0, timedOut: false, shell: "/bin/sh", platform: "linux", environment: "host" };
    },
  });
  const result = await invoke(tools, "run_command", { command: "pwd" });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "workspace-invalid");
  assert.match(result.message, /unavailable/i);
  assert.ok(result.recoveryActions.some((item: any) => item.action === "configure-workspace"));
  assert.equal(executions, 0);
});

test("missing WSL distribution fails preflight before workspace resolution", async () => {
  let resolutions = 0;
  const tools = await toolsProvider(controller("wsl", "Missing"), {
    getSettings: () => ({ ...settings("wsl", "/home/me/project"), wslDistribution: "Missing" }),
    detectWsl: async () => ({ status: "distribution-unavailable", requested: "Missing", available: ["Ubuntu"] }),
    resolveWorkspace: async () => {
      resolutions += 1;
      return { workspaceId: "wsl", providerWorkingDirectory: "/provider/project", executionEnvironment: "wsl", wslDistribution: "Missing", nativeRoot: "/home/me/project" };
    },
  });
  const result = await invoke(tools, "run_command", { command: "pwd" });
  assert.equal(result.success, false);
  assert.equal(result.errorCode, "distribution-missing");
  assert.equal(resolutions, 1);
});

test("Host and WSL controllers keep isolated backend context", async () => {
  const calls: Array<[string, string | undefined, string]> = [];
  const hostTools = await toolsProvider(controller("host"), {
    getSettings: () => settings("host", "/host/project"),
    resolveWorkspace: async () => ({ workspaceId: "host", providerWorkingDirectory: "/provider/project", executionEnvironment: "host", nativeRoot: "/host/project" }),
    createWorkspaceFs: () => ({ resolvePath: async (value: string) => value } as any),
    executeCommand: async (_command, options) => {
      assert.ok(options);
      calls.push([options.executionEnvironment ?? "host", options.wslDistribution, options.cwd ?? ""]);
      return { stdout: "", stderr: "", exitCode: 0, timedOut: false, shell: "/bin/sh", platform: "linux", environment: "host" };
    },
  });
  const wslTools = await toolsProvider(controller("wsl", "Ubuntu"), {
    getSettings: () => ({ ...settings("wsl", "/home/me/project"), wslDistribution: "Ubuntu" }),
    detectWsl: async () => ({ status: "ready", distribution: "Ubuntu", available: ["Ubuntu"] }),
    resolveWorkspace: async () => ({ workspaceId: "wsl", providerWorkingDirectory: "/provider/project", executionEnvironment: "wsl", wslDistribution: "Ubuntu", nativeRoot: "/home/me/project" }),
    createWorkspaceFs: () => ({ resolvePath: async (value: string) => value } as any),
    executeCommand: async (_command, options) => {
      assert.ok(options);
      calls.push([options.executionEnvironment ?? "host", options.wslDistribution, options.cwd ?? ""]);
      return { stdout: "", stderr: "", exitCode: 0, timedOut: false, shell: "/bin/bash", platform: "windows", environment: "wsl" };
    },
  });
  await invoke(hostTools, "run_command", { command: "pwd" });
  await invoke(wslTools, "run_command", { command: "pwd" });
  assert.deepEqual(calls, [["host", undefined, "/host/project"], ["wsl", "Ubuntu", "/home/me/project"]]);
});
