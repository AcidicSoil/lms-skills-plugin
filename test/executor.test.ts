import test from "node:test";
import assert from "node:assert/strict";
import { buildExecutionSpec, buildProgramExecutionSpec, execCommand } from "../src/executor";

test("WSL execution preserves command as one shell argument", () => {
  const command = `printf '%s' "a b; $HOME —"`;
  const spec = buildExecutionSpec(command, { executionEnvironment: "wsl", wslDistribution: "Ubuntu 24.04", cwd: "/home/me/work space" });
  assert.equal(spec.program, "wsl.exe");
  assert.deepEqual(spec.args, ["--distribution", "Ubuntu 24.04", "--cd", "/home/me/work space", "--exec", "/bin/bash", "-lc", command]);
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


test("WSL ignores Host shell selection and always uses Bash", () => {
  const spec = buildExecutionSpec("printf ok", {
    executionEnvironment: "wsl",
    wslDistribution: "Ubuntu",
    cwd: "/home/me/work",
    windowsShell: "powershell",
    shellPath: "C:\\Program Files\\Git\\bin\\bash.exe",
  });
  assert.equal(spec.program, "wsl.exe");
  assert.equal(spec.shell, "/bin/bash");
  assert.deepEqual(spec.args.slice(-3), ["/bin/bash", "-lc", "printf ok"]);
});

test("structured WSL execution bypasses Bash and preserves argv", () => {
  const spec = buildProgramExecutionSpec("git", ["status", "--short", "path with spaces"], {
    cwd: "/home/me/work",
    executionEnvironment: "wsl",
    wslDistribution: "Ubuntu",
  });
  assert.deepEqual(spec, {
    program: "wsl.exe",
    args: ["--distribution", "Ubuntu", "--cd", "/home/me/work", "--exec", "git", "status", "--short", "path with spaces"],
    platform: "windows",
    environment: "wsl",
    shell: "git",
  });
});

import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { execProgram } from "../src/executor";

function nonClosingChild() {
  const child = new EventEmitter() as any;
  child.pid = undefined;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.kill = () => true;
  return child;
}

test("already-aborted command requests do not spawn", async () => {
  const controller = new AbortController();
  controller.abort();
  let spawned = false;
  const result = await execCommand("pwd", {
    cwd: process.cwd(),
    signal: controller.signal,
    spawn: (() => { spawned = true; return nonClosingChild(); }) as any,
  });
  assert.equal(spawned, false);
  assert.equal(result.aborted, true);
  assert.match(result.stderr, /aborted before start/i);
});

test("active command abort settles even when child never closes", async () => {
  const controller = new AbortController();
  const promise = execCommand("sleep 30", {
    cwd: process.cwd(),
    timeoutMs: 10_000,
    signal: controller.signal,
    spawn: (() => nonClosingChild()) as any,
  });
  controller.abort();
  const result = await promise;
  assert.equal(result.aborted, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.terminationIncomplete, true);
  assert.match(result.stderr, /aborted/i);
});

test("structured program abort propagates and settles", async () => {
  const controller = new AbortController();
  const promise = execProgram("node", ["-e", "setInterval(() => {}, 1000)"], {
    cwd: process.cwd(),
    timeoutMs: 10_000,
    signal: controller.signal,
    spawn: (() => nonClosingChild()) as any,
  });
  controller.abort();
  const result = await promise;
  assert.equal(result.aborted, true);
  assert.equal(result.exitCode, 1);
  assert.equal(result.terminationIncomplete, true);
});
