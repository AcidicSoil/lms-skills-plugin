import test from "node:test";
import assert from "node:assert/strict";
import { deriveWorkspaceStatus } from "../src/workspaceSelection";

const profiles = [{ id: "p1", name: "Demo", hostPath: "/tmp/demo", wslPath: "/home/demo" }];

test("workspace selection distinguishes unset", () => {
  const status = deriveWorkspaceStatus({ scope: "chat", environment: "host" }, [], {});
  assert.equal(status.code, "unset");
  assert.equal(status.nativePath, undefined);
  assert.equal(status.executable, false);
});

test("workspace selection reports valid host path", () => {
  const status = deriveWorkspaceStatus({ scope: "chat", profileId: "p1", environment: "host" }, profiles, { exists: true, identityMatches: true });
  assert.equal(status.code, "valid");
  assert.equal(status.nativePath, "/tmp/demo");
  assert.equal(status.executable, true);
});

test("workspace selection reports unavailable without fallback", () => {
  const status = deriveWorkspaceStatus({ scope: "chat", profileId: "p1", environment: "wsl" }, profiles, { exists: false });
  assert.equal(status.code, "unavailable");
  assert.equal(status.nativePath, "/home/demo");
  assert.equal(status.executable, false);
});

test("workspace selection reports moved identity", () => {
  const status = deriveWorkspaceStatus({ scope: "chat", profileId: "p1", environment: "host" }, profiles, { exists: true, identityMatches: false });
  assert.equal(status.code, "moved");
});

test("workspace selection reports configuration required", () => {
  const status = deriveWorkspaceStatus({ scope: "chat", profileId: "missing", environment: "host" }, profiles, {});
  assert.equal(status.code, "configuration-required");
});
