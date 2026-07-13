import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutionSpec, execCommand } from "../src/executor";

test("WSL execution preserves command as one shell argument", () => {
  const command = `printf '%s' "a b; $HOME —"`;
  const spec = buildExecutionSpec(command, { executionEnvironment: "wsl", wslDistribution: "Ubuntu 24.04", cwd: "/home/me/work space" });
  assert.equal(spec.program, "wsl.exe");
  assert.deepEqual(spec.args, ["--distribution", "Ubuntu 24.04", "--cd", "/home/me/work space", "--exec", "/bin/sh", "-lc", command]);
});

test("Host execution rejects missing and invalid cwd", async () => {
  assert.equal((await execCommand("pwd", { cwd: "/definitely/missing/path" })).exitCode, 1);
  assert.match((await execCommand("pwd")).stderr, /working directory is required/i);
});

test("WSL rejects Windows cwd instead of translating it", async () => {
  const result = await execCommand("pwd", { executionEnvironment: "wsl", cwd: "C:\\work" });
  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /not valid for wsl/i);
});
