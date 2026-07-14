import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspaceBackend } from "../src/backend";
import type { WorkspaceContext } from "../src/types";

const wslContext: WorkspaceContext = {
  workspaceId: "wsl-id",
  providerWorkingDirectory: "/provider/project",
  executionEnvironment: "wsl",
  wslDistribution: "Ubuntu",
  nativeRoot: "/home/me/project",
};

test("workspace backend routes command and program through one WSL context", async () => {
  const calls: Array<{ kind: string; args: unknown[] }> = [];
  const fileSystem = { resolvePath: async (value: string) => value } as any;
  const backend = createWorkspaceBackend(wslContext, {
    createFileSystem: () => fileSystem,
    executeCommand: async (command, options) => {
      calls.push({ kind: "command", args: [command, options] });
      return { stdout: "", stderr: "", exitCode: 0, timedOut: false, shell: "/bin/bash", platform: "windows", environment: "wsl" };
    },
    executeProgram: async (program, args, options) => {
      calls.push({ kind: "program", args: [program, args, options] });
      return { stdout: "", stderr: "", exitCode: 0, timedOut: false, shell: program, platform: "windows", environment: "wsl" };
    },
  });
  assert.equal(backend.fileSystem, fileSystem);
  await backend.runCommand("pwd");
  await backend.runProgram("git", ["status"]);
  const commandOptions = calls[0].args[1] as any;
  const programOptions = calls[1].args[2] as any;
  assert.deepEqual([commandOptions.executionEnvironment, commandOptions.wslDistribution, commandOptions.cwd], ["wsl", "Ubuntu", "/home/me/project"]);
  assert.deepEqual([programOptions.executionEnvironment, programOptions.wslDistribution, programOptions.cwd], ["wsl", "Ubuntu", "/home/me/project"]);
});
