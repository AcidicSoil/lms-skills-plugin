import test from "node:test";
import assert from "node:assert/strict";
import * as os from "os";
import { resolveWorkspaceContext } from "../src/workspace";
import { toolsProvider } from "../src/toolsProvider";
import type { PluginController } from "../src/pluginTypes";

const wslConfig = {
  skillsPaths: ["/skills"], autoInject: true, maxSkillsInContext: 15,
  shellPath: "", windowsShell: "cmd" as const, executionEnvironment: "wsl" as const,
  wslDistribution: "Ubuntu",
};

function controller(): PluginController {
  return {
    getWorkingDirectory: () => "C:/project",
    getPluginConfig: () => ({ get: () => undefined }),
  };
}

async function invoke(tools: Awaited<ReturnType<typeof toolsProvider>>, name: string, params: Record<string, unknown> = {}) {
  const selected = tools.find((candidate: any) => candidate.name === name) as any;
  assert.ok(selected);
  return selected.implementation(params, { status() {} });
}

test("diagnostic: WSL capability failures are actionable", async () => {
  const cases = [
    [{ status: "unsupported-platform" } as const, /only available on Windows/i],
    [{ status: "wsl-unavailable", error: "wsl.exe not found" } as const, /wsl\.exe not found/i],
    [{ status: "no-distribution" } as const, /No WSL distribution/i],
    [{ status: "distribution-unavailable", requested: "Ubuntu", available: ["Debian"] as string[] }, /Ubuntu.*Debian/i],
  ] as const;
  for (const [capability, expected] of cases) {
    await assert.rejects(resolveWorkspaceContext("C:/project", wslConfig, {
      detectWsl: async () => capability,
      resolveWslHome: async () => "/home/me",
      mkdirWsl: async () => undefined,
    }), expected);
  }
});

test("diagnostic: inaccessible Host and WSL roots identify workspace creation", async () => {
  await assert.rejects(resolveWorkspaceContext("/project", { ...wslConfig, executionEnvironment: "host", wslDistribution: undefined }, {
    hostBaseRoot: "/denied",
    mkdirHost: async () => { throw new Error("EACCES"); },
  }), /Host workspace.*EACCES/i);
  await assert.rejects(resolveWorkspaceContext("C:/project", wslConfig, {
    detectWsl: async () => ({ status: "ready", distribution: "Ubuntu", available: ["Ubuntu"] }),
    resolveWslHome: async () => { throw new Error("home denied"); },
    mkdirWsl: async () => undefined,
  }), /WSL workspace.*home denied/i);
});

test("diagnostic: timeout uncertainty propagates through run_command", async () => {
  const tools = await toolsProvider(controller(), {
    resolveWorkspace: async () => ({ workspaceId: "id", providerWorkingDirectory: "C:/project", executionEnvironment: "wsl", wslDistribution: "Ubuntu", nativeRoot: "/home/me/work" }),
    executeCommand: async () => ({ stdout: "", stderr: "", exitCode: 1, timedOut: true, shell: "/bin/sh", platform: "windows", environment: "wsl", terminationIncomplete: true }),
  });
  const result = await invoke(tools, "run_command", { command: "sleep 30" });
  assert.equal(result.timedOut, true);
  assert.equal(result.terminationIncomplete, true);
  assert.match(result.hint, /timeout/i);
});
