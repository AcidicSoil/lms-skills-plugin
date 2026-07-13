import test from "node:test";
import assert from "node:assert/strict";
import { classifyPath, resolveEnvironmentPath, isContainedPath } from "../src/pathPolicy";

test("path classification and environment validation", () => {
  assert.equal(classifyPath("C:\\Work\\x"), "windows-drive");
  assert.equal(classifyPath("/home/u/x"), "linux-absolute");
  assert.equal(resolveEnvironmentPath("x y/é", "wsl", "/work").resolvedPath, "/work/x y/é");
  assert.equal(resolveEnvironmentPath("C:\\x", "wsl").ok, false);
  assert.equal(resolveEnvironmentPath("x", "wsl").ok, false);
});

test("containment rejects prefix and canonical escape", () => {
  assert.equal(isContainedPath("/work", "/work/a"), true);
  assert.equal(isContainedPath("/work", "/work-evil/a"), false);
  assert.equal(isContainedPath("/work", "/work/link", {canonicalize: v => v.endsWith("link") ? "/etc" : v}), false);
  assert.equal(isContainedPath("C:\\Work", "c:\\work\\a", {platform:"windows"}), true);
});
