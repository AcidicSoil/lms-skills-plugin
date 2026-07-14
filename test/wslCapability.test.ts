import test from "node:test";
import assert from "node:assert/strict";
import { detectWslCapability } from "../src/wslCapability";

test("WSL capability states and argv", async () => {
  assert.deepEqual(await detectWslCapability(undefined, async () => ({stdout:"",stderr:"",exitCode:0}), "linux"), {status:"unsupported-platform"});
  let seen: [string,string[]] | undefined;
  const ready = await detectWslCapability("Ubuntu", async (p,a) => { seen=[p,a]; return {stdout:"Ubuntu\nDebian\n",stderr:"",exitCode:0}; }, "win32");
  assert.deepEqual(seen, ["wsl.exe", ["--list","--quiet"]]);
  assert.equal(ready.status, "ready");
  const missing = await detectWslCapability("Missing", async () => ({stdout:"Ubuntu\n",stderr:"",exitCode:0}), "win32");
  assert.equal(missing.status, "distribution-unavailable");
});

test("WSL capability uses the system default and distinguishes missing default", async () => {
  const calls: string[][] = [];
  const ready = await detectWslCapability(undefined, async (_program, args) => {
    calls.push(args);
    return args[0] === "--list"
      ? { stdout: "Ubuntu\nDebian\n", stderr: "", exitCode: 0 }
      : { stdout: "Default Distribution: Debian\n", stderr: "", exitCode: 0 };
  }, "win32");
  assert.deepEqual(calls, [["--list", "--quiet"], ["--status"]]);
  assert.deepEqual(ready, { status: "ready", distribution: "Debian", available: ["Ubuntu", "Debian"] });

  const missing = await detectWslCapability(undefined, async (_program, args) => args[0] === "--list"
    ? { stdout: "Ubuntu\n", stderr: "", exitCode: 0 }
    : { stdout: "", stderr: "no default", exitCode: 1 }, "win32");
  assert.equal(missing.status, "no-default-distribution");
});
