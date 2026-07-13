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
