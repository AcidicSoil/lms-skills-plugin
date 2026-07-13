import { rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import process from "node:process";

const testOutput = ".test-dist";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`);
  }
}

try {
  await rm(testOutput, { recursive: true, force: true });
  const tsc = process.platform === "win32" ? "npx.cmd" : "npx";
  run(tsc, ["tsc", "-p", "tsconfig.test.json"]);
  run(process.execPath, ["--test", `${testOutput}/test/*.test.js`]);
} finally {
  await rm(testOutput, { recursive: true, force: true });
}
