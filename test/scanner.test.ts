import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { scanSkills } from "../src/scanner";

test("scanSkills discovers child skill directories without requiring root-level SKILL.md", async () => {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), "skills-root-"));
  try {
    const first = path.join(root, "first-skill");
    const second = path.join(root, "second-skill");
    await fs.promises.mkdir(first, { recursive: true });
    await fs.promises.mkdir(second, { recursive: true });
    await fs.promises.writeFile(
      path.join(first, "SKILL.md"),
      "---\nname: First Skill\ndescription: First test skill\n---\n# First Skill\n",
      "utf8",
    );
    await fs.promises.writeFile(
      path.join(second, "SKILL.md"),
      "---\nname: Second Skill\ndescription: Second test skill\n---\n# Second Skill\n",
      "utf8",
    );

    const skills = scanSkills([root]);

    assert.equal(skills.length, 2);
    assert.deepEqual(skills.map((skill) => skill.name).sort(), ["first-skill", "second-skill"]);
    for (const skill of skills) {
      assert.equal(path.basename(skill.skillMdPath), "SKILL.md");
      assert.equal(path.dirname(path.dirname(skill.skillMdPath)), root);
    }
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
