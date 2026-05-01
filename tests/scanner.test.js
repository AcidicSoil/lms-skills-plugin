const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  scanSkills,
  resolveSkillByName,
  searchSkillSet,
  readSkillFile,
  listSkillDirectory,
  listAbsoluteDirectory,
} = require('../dist/scanner.js');

async function withTempSkills(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'lms-skills-test-'));
  try {
    await fs.mkdir(path.join(root, 'PROMPTS', 'example-skill'), { recursive: true });
    await fs.mkdir(path.join(root, 'direct'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'PROMPTS', 'example-skill', 'SKILL.md'),
      '# Example Skill\n\nUse the example fixture workflow.\n',
      'utf8',
    );
    await fs.writeFile(
      path.join(root, 'PROMPTS', 'example-skill', 'example.txt'),
      'example support content',
      'utf8',
    );
    await fs.writeFile(
      path.join(root, 'direct', 'SKILL.md'),
      '# Direct\n\nDirect root-level skill.\n',
      'utf8',
    );
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function createRegistry() {
  const runtime = {
    target: 'wsl',
    label: 'WSL',
    displayName: 'WSL',
    shell: 'bash',
    async expandPath(value) { return path.posix.normalize(value); },
    async exists(value) {
      try { await fs.access(value); return true; } catch { return false; }
    },
    async stat(value) {
      const stat = await fs.stat(value);
      return {
        size: stat.size,
        sizeBytes: stat.size,
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
      };
    },
    async readFile(value) { return fs.readFile(value, 'utf8'); },
    async readDir(value) {
      const entries = await fs.readdir(value, { withFileTypes: true });
      const result = [];
      for (const entry of entries) {
        if (entry.isDirectory()) result.push({ name: entry.name, type: 'directory' });
        else if (entry.isFile()) {
          const stat = await fs.stat(path.posix.join(value, entry.name));
          result.push({ name: entry.name, type: 'file', sizeBytes: stat.size });
        }
      }
      return result;
    },
  };
  return { getRuntime() { return runtime; } };
}

function createRoot(root) {
  return {
    environment: 'wsl',
    environmentLabel: 'WSL',
    rawPath: root,
    resolvedPath: root,
    displayPath: `WSL:${root}`,
  };
}

test('scanSkills discovers direct and nested SKILL.md entrypoints', async () => {
  await withTempSkills(async (rootPath) => {
    const skills = await scanSkills([createRoot(rootPath)], createRegistry());
    assert.deepEqual(skills.map((skill) => skill.name).sort(), ['direct', 'example-skill']);
    assert.ok(
      skills.some((skill) => skill.resolvedDirectoryPath.endsWith('/PROMPTS/example-skill')),
      'nested example-skill skill should retain its nested directory path',
    );
  });
});

test('resolveSkillByName finds a nested directory by exact skill name', async () => {
  await withTempSkills(async (rootPath) => {
    const skill = await resolveSkillByName([createRoot(rootPath)], createRegistry(), 'example-skill');
    assert.ok(skill, 'expected example-skill skill to resolve');
    assert.equal(skill.name, 'example-skill');
    assert.ok(skill.resolvedSkillMdPath.endsWith('/PROMPTS/example-skill/SKILL.md'));
  });
});

test('searchSkillSet reuses an existing scan result for scoring', async () => {
  await withTempSkills(async (rootPath) => {
    const skills = await scanSkills([createRoot(rootPath)], createRegistry());
    const results = searchSkillSet(skills, 'example-skill');
    assert.equal(results[0]?.skill.name, 'example-skill');
  });
});

test('readSkillFile reads SKILL.md without frontmatter and support files by relative path', async () => {
  await withTempSkills(async (rootPath) => {
    const registry = createRegistry();
    const skill = await resolveSkillByName([createRoot(rootPath)], registry, 'example-skill');
    assert.ok(skill, 'expected example-skill skill to resolve');

    const skillMd = await readSkillFile(skill, undefined, registry);
    assert.equal('error' in skillMd, false);
    assert.match(skillMd.content, /Use the example fixture workflow/);

    const support = await readSkillFile(skill, 'example.txt', registry);
    assert.equal('error' in support, false);
    assert.equal(support.content, 'example support content');

    const traversal = await readSkillFile(skill, '../direct/SKILL.md', registry);
    assert.equal('error' in traversal, true);
  });
});

test('listSkillDirectory lists only entries inside a resolved skill directory', async () => {
  await withTempSkills(async (rootPath) => {
    const registry = createRegistry();
    const skill = await resolveSkillByName([createRoot(rootPath)], registry, 'example-skill');
    assert.ok(skill, 'expected example-skill skill to resolve');

    const entries = await listSkillDirectory(skill, undefined, registry);
    assert.ok(entries.some((entry) => entry.relativePath === 'SKILL.md'));
    assert.ok(entries.some((entry) => entry.relativePath === 'example.txt'));

    const outsideEntries = await listSkillDirectory(skill, '..', registry);
    assert.deepEqual(outsideEntries, []);
  });
});

test('listAbsoluteDirectory exposes nested skill tree entries without file reads by caller', async () => {
  await withTempSkills(async (rootPath) => {
    const entries = await listAbsoluteDirectory(`WSL:${rootPath}`, [createRoot(rootPath)], createRegistry());
    assert.ok(entries.some((entry) => entry.relativePath === 'PROMPTS/example-skill/SKILL.md'));
    assert.ok(entries.some((entry) => entry.relativePath === 'PROMPTS/example-skill/example.txt'));
  });
});
