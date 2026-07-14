import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRepositoryIdentity, validateRepositoryIdentity } from "../src/repositoryIdentity";

test("repository identity normalizes path markers without Git", () => {
  assert.equal(normalizeRepositoryIdentity(" C:\\Work\\Demo\\ "), "c:/work/demo");
  assert.deepEqual(validateRepositoryIdentity("C:\\Work\\Demo", "c:/work/demo/"), { status: "match" });
});

test("repository identity remains advisory when either side is absent", () => {
  assert.deepEqual(validateRepositoryIdentity(undefined, "/work/demo"), { status: "unknown" });
});

test("repository identity fails closed on mismatch", () => {
  assert.deepEqual(validateRepositoryIdentity("/work/demo", "/work/other"), { status: "mismatch", expected: "/work/demo", actual: "/work/other" });
});
