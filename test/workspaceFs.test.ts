import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  createWorkspaceFileSystem,
  type DirectExecutionRequest,
  type DirectExecutionResult,
} from "../src/workspaceFs";
import type { WorkspaceContext } from "../src/types";

async function withTempRoot(run: (root: string) => Promise<void>): Promise<void> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lms-skills-workspace-"));
  try { await run(root); } finally { await fs.promises.rm(root, { recursive: true, force: true }); }
}

test("host workspace filesystem lifecycle stays contained", async () => {
  await withTempRoot(async (root) => {
    const context: WorkspaceContext = {
      workspaceId: "abc",
      providerWorkingDirectory: "/provider",
      executionEnvironment: "host",
      nativeRoot: root,
    };
    const workspaceFs = createWorkspaceFileSystem(context);
    await workspaceFs.createDirectory("docs");
    await workspaceFs.writeFile("docs/a.txt", "hello");
    await workspaceFs.appendFile("docs/a.txt", " world");
    assert.equal((await workspaceFs.readFile("docs/a.txt")).content, "hello world");
    await workspaceFs.patchFile("docs/a.txt", "world", "WSL");
    assert.equal((await workspaceFs.readFile("docs/a.txt")).content, "hello WSL");
    const listed = await workspaceFs.listDirectory("docs");
    assert.equal(listed.entries[0]?.name, "a.txt");
    await workspaceFs.moveFile("docs/a.txt", "docs/b.txt");
    await workspaceFs.renameFile("docs/b.txt", "c.txt");
    await workspaceFs.deleteFile("docs/c.txt");
    await assert.rejects(workspaceFs.readFile("../escape.txt"), /outside|escape/i);
  });
});

test("host workspace filesystem rejects canonical symlink escape", async () => {
  await withTempRoot(async (root) => {
    const outside = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lms-skills-outside-"));
    try {
      await fs.promises.symlink(outside, path.join(root, "link"));
      const context: WorkspaceContext = { workspaceId: "abc", providerWorkingDirectory: "/provider", executionEnvironment: "host", nativeRoot: root };
      const workspaceFs = createWorkspaceFileSystem(context);
      await assert.rejects(workspaceFs.writeFile("link/escape.txt", "no"), /outside|escape/i);
    } finally { await fs.promises.rm(outside, { recursive: true, force: true }); }
  });
});

test("WSL workspace filesystem uses argv and stdin without content interpolation", async () => {
  const calls: DirectExecutionRequest[] = [];
  const runner = async (request: DirectExecutionRequest): Promise<DirectExecutionResult> => {
    calls.push(request);
    if (request.program === "cat") return { stdout: "value", stderr: "", exitCode: 0, timedOut: false };
    return { stdout: "", stderr: "", exitCode: 0, timedOut: false };
  };
  const context: WorkspaceContext = {
    workspaceId: "abc",
    providerWorkingDirectory: "C:/provider",
    executionEnvironment: "wsl",
    wslDistribution: "Ubuntu 24.04",
    nativeRoot: "/home/me/.lmstudio/lms-skills/workspaces/abc",
  };
  const workspaceFs = createWorkspaceFileSystem(context, { runDirect: runner, canonicalizeWsl: async (value) => value });
  const content = "quotes ' \" ; $HOME\nUnicode —";
  await workspaceFs.writeFile("space dir/a.txt", content);
  await workspaceFs.readFile("space dir/a.txt");
  const teeCall = calls.find((call) => call.program === "tee");
  assert.deepEqual(teeCall, {
    environment: "wsl",
    distribution: "Ubuntu 24.04",
    cwd: context.nativeRoot,
    program: "tee",
    args: ["--", "/home/me/.lmstudio/lms-skills/workspaces/abc/space dir/a.txt"],
    stdin: content,
  });
  assert.equal(JSON.stringify(teeCall).includes("$HOME"), true);
  assert.equal(teeCall?.args.join(" ").includes("$HOME"), false);
});
