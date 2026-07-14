import test from "node:test";
import assert from "node:assert/strict";
import { expandHostSkillsPath, normalizePersistedSettings } from "../src/settings";

test("legacy settings default to Host execution", () => {
  const normalized = normalizePersistedSettings({
    skillsPaths: ["/skills"],
    autoInject: false,
    maxSkillsInContext: 7,
    shellPath: "/bin/bash",
    windowsShell: "cmd",
  });
  assert.equal(normalized.executionEnvironment, "host");
  assert.equal(normalized.wslDistribution, undefined);
  assert.deepEqual(normalized.skillsPaths, ["/skills"]);
  assert.equal(normalized.autoInject, false);
});

test("invalid execution settings cannot corrupt configuration", () => {
  const normalized = normalizePersistedSettings({ executionEnvironment: "invalid" as never, wslDistribution: "   " });
  assert.equal(normalized.executionEnvironment, "host");
  assert.equal(normalized.wslDistribution, undefined);
});


test("tilde-prefixed skill roots expand before scanning child skill directories", () => {
  const expanded = expandHostSkillsPath("~/.agents/skills");
  assert.ok(expanded.endsWith("/.agents/skills") || expanded.endsWith("\\.agents\\skills"));
  assert.ok(!expanded.startsWith("~"));

  const normalized = normalizePersistedSettings({ skillsPaths: ["~/.agents/skills"] });
  assert.equal(normalized.skillsPaths[0], expanded);
});


test("WSL defaults keep skill roots Linux-native", () => {
  const normalized = normalizePersistedSettings({ executionEnvironment: "wsl" });
  assert.deepEqual(normalized.skillsPaths, ["~/.lmstudio/skills"]);
});

test("workspace profile settings remain backward compatible and environment-specific", () => {
  const legacy = normalizePersistedSettings({ executionEnvironment: "host" });
  assert.deepEqual(legacy.workspaceProfiles, []);
  assert.equal(legacy.hostWorkspacePath, undefined);
  assert.equal(legacy.wslWorkspacePath, undefined);

  const normalized = normalizePersistedSettings({
    executionEnvironment: "wsl",
    wslDistribution: "",
    hostWorkspacePath: "C:\\work\\demo",
    wslWorkspacePath: "/home/me/demo",
    activeWorkspaceProfileId: " demo ",
    workspaceProfiles: [{ id: " demo ", name: " Demo ", hostPath: " C:\\work\\demo ", wslPath: " /home/me/demo " }],
  });
  assert.equal(normalized.wslDistribution, undefined);
  assert.equal(normalized.activeWorkspaceProfileId, "demo");
  assert.equal(normalized.hostWorkspacePath, "C:\\work\\demo");
  assert.equal(normalized.wslWorkspacePath, "/home/me/demo");
  assert.deepEqual(normalized.workspaceProfiles, [{
    id: "demo",
    name: "Demo",
    hostPath: "C:\\work\\demo",
    wslPath: "/home/me/demo",
    enabled: true,
    trusted: false,
    preferred: false,
    deleted: false,
    createdAt: undefined,
    updatedAt: undefined,
    repositoryIdentity: undefined,
  }]);
});
