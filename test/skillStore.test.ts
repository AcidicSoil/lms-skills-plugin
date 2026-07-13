import test from "node:test";
import assert from "node:assert/strict";
import { createSkillStore } from "../src/skillStore";
import type { EffectiveConfig } from "../src/types";
import type { ExecProgramOptions, ExecResult } from "../src/executor";

function result(stdout = "", stderr = "", exitCode = 0): ExecResult {
  return {
    stdout,
    stderr,
    exitCode,
    timedOut: false,
    shell: "test",
    platform: "windows",
    environment: "wsl",
  };
}

test("WSL skill store resolves tilde in the selected distribution and discovers child skills", async () => {
  const calls: Array<{ program: string; args: string[]; options: ExecProgramOptions }> = [];
  const config: EffectiveConfig = {
    skillsPaths: ["~/.agents/skills"],
    autoInject: true,
    maxSkillsInContext: 15,
    shellPath: "",
    windowsShell: "cmd",
    executionEnvironment: "wsl",
    wslDistribution: "Ubuntu",
  };
  const runner = async (program: string, args: string[], options: ExecProgramOptions): Promise<ExecResult> => {
    calls.push({ program, args, options });
    if (program === "printenv") return result("/home/user\n");
    if (program === "find" && args.includes("-mindepth") && args[args.indexOf("-mindepth") + 1] === "2") {
      assert.equal(args[0], "/home/user/.agents/skills");
      return result("/home/user/.agents/skills/docx/SKILL.md\n");
    }
    if (program === "cat") {
      assert.equal(args[1], "/home/user/.agents/skills/docx/SKILL.md");
      return result("# DOCX\n\nCreate and edit Word documents.\n");
    }
    if (program === "find") return result("/home/user/.agents/skills/docx/scripts\n");
    return result("", "unexpected command", 1);
  };

  const store = createSkillStore(config, { execProgram: runner });
  const skills = await store.scan();

  assert.equal(skills.length, 1);
  assert.equal(skills[0].name, "docx");
  assert.equal(skills[0].directoryPath, "/home/user/.agents/skills/docx");
  assert.deepEqual(store.roots, ["/home/user/.agents/skills"]);
  assert.ok(calls.every((call) => call.options.executionEnvironment === "wsl"));
  assert.ok(calls.every((call) => call.options.wslDistribution === "Ubuntu"));
  assert.ok(calls.every((call) => !call.args.some((arg) => arg.includes("C:\\Users"))));
});

test("WSL skill store reads and lists files through WSL", async () => {
  const config: EffectiveConfig = {
    skillsPaths: ["/home/user/.agents/skills"],
    autoInject: true,
    maxSkillsInContext: 15,
    shellPath: "",
    windowsShell: "cmd",
    executionEnvironment: "wsl",
    wslDistribution: "Ubuntu",
  };
  const runner = async (program: string, args: string[], _options: ExecProgramOptions): Promise<ExecResult> => {
    if (program === "printenv") return result("/home/user\n");
    if (program === "find" && args.includes("SKILL.md")) return result("/home/user/.agents/skills/docx/SKILL.md\n");
    if (program === "cat") return result("# DOCX\n\nInstructions\n");
    if (program === "find") {
      return result("f\t20\t/home/user/.agents/skills/docx/SKILL.md\nd\t0\t/home/user/.agents/skills/docx/scripts\n");
    }
    return result("", "unexpected command", 1);
  };

  const store = createSkillStore(config, { execProgram: runner });
  const skill = (await store.scan())[0];
  const read = await store.read(skill);
  assert.ok("content" in read);
  const entries = await store.list(skill);
  assert.deepEqual(entries.map((entry) => entry.relativePath), ["SKILL.md", "scripts"]);
});
