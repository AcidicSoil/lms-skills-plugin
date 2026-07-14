import test from "node:test";
import assert from "node:assert/strict";
import { toolsProvider } from "../src/toolsProvider";
import type { PluginController } from "../src/pluginTypes";
import type { PersistedSettings } from "../src/types";

function controller(environment: "host" | "wsl"): PluginController {
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
          wslDistribution: "",
        };
        return values[key];
      },
    }),
  };
}

const base: PersistedSettings = {
  skillsPaths: ["/skills"],
  autoInject: true,
  maxSkillsInContext: 15,
  shellPath: "",
  windowsShell: "cmd",
  executionEnvironment: "host",
  workspaceProfiles: [],
};

async function invoke(tools: any[], name: string, params: Record<string, unknown> = {}) {
  const selected = tools.find((candidate) => candidate.name === name);
  assert.ok(selected, `Missing tool ${name}`);
  return selected.implementation(params, { status() {} });
}

test("environment-specific workspace configuration tools omit irrelevant controls", async () => {
  let settings = { ...base };
  const deps = {
    getSettings: () => settings,
    updateSettings: (patch: Partial<PersistedSettings>) => (settings = { ...settings, ...patch }),
    resolveWorkspace: async () => ({ workspaceId: "id", providerWorkingDirectory: "/provider/project", executionEnvironment: "host" as const, nativeRoot: "/tmp/project" }),
  };
  const host = await toolsProvider(controller("host"), deps);
  assert.ok(host.some((tool: any) => tool.name === "configure_host_workspace"));
  assert.ok(!host.some((tool: any) => tool.name === "configure_wsl_workspace"));
  assert.ok(!host.some((tool: any) => tool.name === "refresh_wsl_capability"));
  const configured = await invoke(host, "configure_host_workspace", { path: "/work/demo", profile_name: "Demo" });
  assert.equal(configured.path, "/work/demo");
  assert.equal(settings.hostWorkspacePath, "/work/demo");

  settings = { ...base, executionEnvironment: "wsl" };
  const wsl = await toolsProvider(controller("wsl"), {
    ...deps,
    getSettings: () => settings,
    detectWsl: async () => ({ status: "ready" as const, distribution: "Ubuntu", available: ["Ubuntu"] }),
  });
  assert.ok(wsl.some((tool: any) => tool.name === "configure_wsl_workspace"));
  assert.ok(wsl.some((tool: any) => tool.name === "refresh_wsl_capability"));
  assert.ok(!wsl.some((tool: any) => tool.name === "configure_host_workspace"));
});

test("WSL capability refresh is side-effect free", async () => {
  const settings = { ...base, executionEnvironment: "wsl" as const, activeWorkspaceProfileId: "p1", wslDistribution: "Ubuntu" };
  let writes = 0;
  let probes = 0;
  const tools = await toolsProvider(controller("wsl"), {
    getSettings: () => settings,
    updateSettings: (patch) => { writes += 1; return { ...settings, ...patch }; },
    detectWsl: async () => { probes += 1; return { status: "ready", distribution: "Ubuntu", available: ["Ubuntu"] }; },
    resolveWorkspace: async () => ({ workspaceId: "id", providerWorkingDirectory: "/provider/project", executionEnvironment: "wsl", wslDistribution: "Ubuntu", nativeRoot: "/home/demo" }),
  });
  const result = await invoke(tools, "refresh_wsl_capability");
  assert.equal(result.capability.status, "ready");
  assert.equal(probes, 1);
  assert.equal(writes, 0);
});
