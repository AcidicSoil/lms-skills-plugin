import test from "node:test";
import assert from "node:assert/strict";
import { linuxPathToWslUnc, validateWslDistribution, wslDisplayPathToNative } from "../src/wslPath";

test("linuxPathToWslUnc maps Linux absolute paths without user-specific assumptions", () => {
  assert.equal(
    linuxPathToWslUnc("Ubuntu-24.04", "/home/alice/project/src"),
    "\\\\wsl$\\Ubuntu-24.04\\home\\alice\\project\\src",
  );
});

test("WSL path mapping rejects invalid distribution names and relative paths", () => {
  assert.throws(() => validateWslDistribution("../Ubuntu"), /invalid/i);
  assert.throws(() => linuxPathToWslUnc("Ubuntu", "home/alice"), /absolute/i);
});

test("non-Windows development hosts retain Linux paths for testability", () => {
  assert.equal(wslDisplayPathToNative("Ubuntu", "/home/alice", "linux"), "/home/alice");
});
