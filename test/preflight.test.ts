import test from "node:test";
import assert from "node:assert/strict";
import { runPreflight } from "../src/preflight";
import type { WorkspaceStatus } from "../src/workspaceSelection";

const valid: WorkspaceStatus = {
  code: "valid",
  scope: "chat",
  environment: "host",
  nativePath: "/work/demo",
  executable: true,
  message: "Workspace is ready.",
};

test("preflight accepts a valid invocation context", () => {
  const result = runPreflight({ environment: "host", workspace: valid });
  assert.equal(result.ok, true);
});

for (const [name, input, expected] of [
  ["workspace invalid", { environment: "host", workspace: { ...valid, code: "unavailable", executable: false, message: "missing" } }, "workspace-invalid"],
  ["environment unavailable", { environment: "wsl", workspace: { ...valid, environment: "wsl" }, capability: { status: "wsl-unavailable", error: "missing" } }, "environment-unavailable"],
  ["distribution missing", { environment: "wsl", workspace: { ...valid, environment: "wsl" }, capability: { status: "no-distribution" } }, "distribution-missing"],
  ["tool incompatible", { environment: "wsl", workspace: { ...valid, environment: "wsl" }, capability: { status: "ready", distribution: "Ubuntu", available: ["Ubuntu"] }, tool: { name: "host-only", environments: ["host"] } }, "tool-incompatible"],
  ["approval denied", { environment: "host", workspace: valid, approvalGranted: false }, "approval-denied"],
  ["identity mismatch", { environment: "host", workspace: valid, identityMatches: false }, "identity-mismatch"],
  ["termination unresolved", { environment: "host", workspace: valid, terminationResolved: false }, "termination-unresolved"],
] as const) {
  test(`preflight returns structured recovery for ${name}`, () => {
    const result = runPreflight(input as any);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, expected);
      assert.ok(result.error.message.length > 0);
      assert.ok(result.error.recoveryActions.length > 0);
    }
  });
}
