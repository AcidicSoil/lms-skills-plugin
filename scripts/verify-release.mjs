import { rm, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

await rm("dist", { recursive: true, force: true });
await rm(".test-dist", { recursive: true, force: true });
run(process.platform === "win32" ? "npm.cmd" : "npm", ["test"]);
run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
for (const file of [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/executor.js",
  "dist/workspace.js",
  "dist/workspaceFs.js",
]) {
  await access(file);
}
run("git", ["diff", "--check"]);
const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { encoding: "utf8" });
if (status.error) throw status.error;
if (status.status !== 0) process.exit(status.status ?? 1);
if (status.stdout.trim()) {
  console.error("Tracked files changed during release verification:\n" + status.stdout);
  process.exit(1);
}
console.log("Release verification passed.");
