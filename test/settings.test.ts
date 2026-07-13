import test from "node:test";
import assert from "node:assert/strict";
import { normalizePersistedSettings } from "../src/settings";

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
