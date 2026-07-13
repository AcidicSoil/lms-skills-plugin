import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveWorkspaceId,
  resolveWorkspaceContext,
  type WorkspaceDependencies,
} from "../src/workspace";

const hostConfig = {
  skillsPaths: ["/skills"],
  autoInject: true,
  maxSkillsInContext: 15,
  shellPath: "",
  windowsShell: "cmd" as const,
  executionEnvironment: "host" as const,
};

test("workspace identity is deterministic and environment-aware", () => {
  const a = deriveWorkspaceId(" /Projects/Demo/ ", "host");
  const b = deriveWorkspaceId("/Projects/Demo", "host");
  const c = deriveWorkspaceId("/Projects/Demo", "wsl", "Ubuntu");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.throws(() => deriveWorkspaceId("   ", "host"), /working directory/i);
});

test("workspace root creation is idempotent for Host", async () => {
  const created: string[] = [];
  const deps: WorkspaceDependencies = {
    hostBaseRoot: "/plugin/workspaces",
    mkdirHost: async (value) => { created.push(value); },
    detectWsl: async () => ({ status: "unsupported-platform" }),
    resolveWslHome: async () => "/home/user",
    mkdirWsl: async () => undefined,
  };
  const first = await resolveWorkspaceContext("/project/demo", hostConfig, deps);
  const second = await resolveWorkspaceContext("/project/demo", hostConfig, deps);
  assert.equal(first.workspaceId, second.workspaceId);
  assert.equal(first.nativeRoot, second.nativeRoot);
  assert.equal(created.length, 2);
  assert.match(first.nativeRoot, /^\/plugin\/workspaces\//);
});

test("WSL root is Linux-native and capability failure does not create", async () => {
  let created = false;
  const deps: WorkspaceDependencies = {
    hostBaseRoot: "/plugin/workspaces",
    mkdirHost: async () => undefined,
    detectWsl: async () => ({ status: "distribution-unavailable", requested: "Missing", available: ["Ubuntu"] }),
    resolveWslHome: async () => "/home/user",
    mkdirWsl: async () => { created = true; },
  };
  await assert.rejects(
    resolveWorkspaceContext("/project/demo", { ...hostConfig, executionEnvironment: "wsl", wslDistribution: "Missing" }, deps),
    /distribution/i,
  );
  assert.equal(created, false);

  const readyDeps: WorkspaceDependencies = {
    ...deps,
    detectWsl: async () => ({ status: "ready", distribution: "Ubuntu", available: ["Ubuntu"] }),
    mkdirWsl: async () => undefined,
  };
  const context = await resolveWorkspaceContext("/project/demo", { ...hostConfig, executionEnvironment: "wsl", wslDistribution: "Ubuntu" }, readyDeps);
  assert.match(context.nativeRoot, /^\/home\/user\/\.lmstudio\/lms-skills\/workspaces\//);
  assert.equal(context.wslDistribution, "Ubuntu");
});
