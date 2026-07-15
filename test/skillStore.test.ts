import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createSkillStore } from "../src/skillStore";
import type { EffectiveConfig } from "../src/types";
import type { ExecProgramOptions, ExecResult } from "../src/executor";

function result(stdout = "", stderr = "", exitCode = 0): ExecResult {
  return { stdout, stderr, exitCode, timedOut: false, shell: "test", platform: "windows", environment: "wsl" };
}

async function withSkillRoot(run: (nativeRoot: string) => Promise<void>): Promise<void> {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "lms-skills-store-"));
  await fs.promises.mkdir(path.join(root, "docx", "scripts"), { recursive: true });
  await fs.promises.writeFile(path.join(root, "docx", "SKILL.md"), "# DOCX\n\nCreate and edit Word documents.\n", "utf8");
  await fs.promises.writeFile(path.join(root, "docx", "scripts", "run.js"), "", "utf8");
  try { await run(root); } finally { await fs.promises.rm(root, { recursive: true, force: true }); }
}

const config = (skillsPaths: string[]): EffectiveConfig => ({
  skillsPaths,
  autoInject: true,
  maxSkillsInContext: 15,
  shellPath: "",
  windowsShell: "cmd",
  executionEnvironment: "wsl",
  wslDistribution: "Ubuntu",
});

test("WSL skill store resolves legacy tilde once and scans through native fs", async () => {
  await withSkillRoot(async (nativeRoot) => {
    const calls: Array<{ program: string; args: string[]; options: ExecProgramOptions }> = [];
    const runner = async (program: string, args: string[], options: ExecProgramOptions): Promise<ExecResult> => {
      calls.push({ program, args, options });
      return program === "printenv" ? result("/home/user\n") : result("", "unexpected command", 1);
    };
    const linuxRoot = "/home/user/.agents/skills";
    const store = createSkillStore(config(["~/.agents/skills"]), {
      execProgram: runner,
      toNativeWslPath: (value) => path.join(nativeRoot, path.posix.relative(linuxRoot, value)),
    });
    const skills = await store.scan();
    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, "docx");
    assert.equal(skills[0].directoryPath, "/home/user/.agents/skills/docx");
    assert.deepEqual(store.roots, [linuxRoot]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].program, "printenv");
  });
});

test("WSL skill store reads and lists through native fs without spawning", async () => {
  await withSkillRoot(async (nativeRoot) => {
    const linuxRoot = "/home/user/.agents/skills";
    let calls = 0;
    const runner = async (): Promise<ExecResult> => { calls += 1; return result("", "unexpected", 1); };
    const store = createSkillStore(config([linuxRoot]), {
      execProgram: runner,
      toNativeWslPath: (value) => path.join(nativeRoot, path.posix.relative(linuxRoot, value)),
    });
    const skill = (await store.scan())[0];
    const read = await store.read(skill);
    assert.ok("content" in read);
    const entries = await store.list(skill);
    assert.deepEqual(entries.map((entry) => entry.relativePath), ["SKILL.md", "scripts", "scripts/run.js"]);
    assert.equal(calls, 0);
  });
});
