const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

async function withTempSkills(fn) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'lms-tools-provider-test-'));
  const skillsRoot = path.join(workspace, 'skills');
  const fakeHome = path.join(workspace, 'home');
  try {
    await fs.mkdir(path.join(skillsRoot, 'PROMPTS', 'caveman', 'references'), { recursive: true });
    await fs.mkdir(path.join(fakeHome, '.lmstudio', 'plugin-data', 'lms-skills'), { recursive: true });
    await fs.writeFile(
      path.join(skillsRoot, 'PROMPTS', 'caveman', 'SKILL.md'),
      [
        '---',
        'name: caveman',
        'description: Primitive style helper.',
        'tags: [style, primitive]',
        '---',
        '',
        '# Caveman',
        '',
        'Use terse primitive wording.',
        '',
      ].join('\n'),
      'utf8',
    );
    await fs.writeFile(
      path.join(skillsRoot, 'PROMPTS', 'caveman', 'references', 'guide.md'),
      'Reference says: short words.',
      'utf8',
    );
    return await fn({ workspace, skillsRoot, fakeHome });
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

function createController(skillsRoot) {
  return {
    getPluginConfig() {
      return {
        get(key) {
          const values = {
            autoInject: 'on',
            maxSkillsInContext: 15,
            skillsPath: skillsRoot,
            skillsEnvironment: 'wsl',
            shellPath: '',
            windowsShellPath: '',
            wslShellPath: '',
            wslDistro: '',
            commandExecutionMode: 'disabled',
            skillSearchBackend: 'builtin',
            qmdExecutable: 'qmd',
            ckExecutable: 'ck',
          };
          return values[key];
        },
      };
    },
  };
}

function createToolContext() {
  const statuses = [];
  const warnings = [];
  return {
    statuses,
    warnings,
    ctx: {
      status(message) { statuses.push(message); },
      warn(message) { warnings.push(message); },
      signal: new AbortController().signal,
      callId: 'test-call',
    },
  };
}

function byName(tools) {
  return new Map(tools.map((tool) => [tool.name, tool]));
}

async function callTool(tool, args) {
  const { statuses, warnings, ctx } = createToolContext();
  const result = await tool.implementation(args, ctx);
  return { result, statuses, warnings };
}

function assertHasDebugStatus(toolName, statuses) {
  assert.ok(
    statuses.some((message) => message.includes(`[debug] ${toolName}: started`)),
    `expected ${toolName} start debug status, got ${JSON.stringify(statuses)}`,
  );
}

test('toolsProvider registers and exercises every available tool with visible debug statuses', async () => {
  await withTempSkills(async ({ skillsRoot, fakeHome }) => {
    const originalHome = process.env.HOME;
    process.env.HOME = fakeHome;
    try {
      const { toolsProvider } = require('../dist/toolsProvider.js');
      const tools = byName(await toolsProvider(createController(skillsRoot)));
      assert.deepEqual([...tools.keys()].sort(), [
        'list_skill_files',
        'list_skill_roots',
        'list_skills',
        'read_skill_file',
        'run_command',
        'search_skill_roots',
      ]);

      const list = await callTool(tools.get('list_skills'), { query: 'caveman' });
      assert.equal(list.result.found, 1);
      assert.equal(list.result.skills[0].name, 'caveman');
      assertHasDebugStatus('list_skills', list.statuses);
      assert.ok(list.statuses.some((message) => message.includes('resolving skill roots')));
      assert.ok(list.statuses.some((message) => message.includes('checking exact skill match')));
      assert.equal(list.warnings.length, 0);

      const readSkill = await callTool(tools.get('read_skill_file'), { skill_name: 'caveman' });
      assert.equal(readSkill.result.success, true);
      assert.equal(readSkill.result.skill, 'caveman');
      assert.match(readSkill.result.content, /Use terse primitive wording/);
      assert.doesNotMatch(readSkill.result.content, /^---/);
      assertHasDebugStatus('read_skill_file', readSkill.statuses);

      const listFiles = await callTool(tools.get('list_skill_files'), { skill_name: 'caveman' });
      assert.equal(listFiles.result.success, true);
      assert.ok(listFiles.result.entries.some((entry) => entry.path === 'SKILL.md'));
      assert.ok(listFiles.result.entries.some((entry) => entry.path === 'references/guide.md'));
      assertHasDebugStatus('list_skill_files', listFiles.statuses);

      const readSupport = await callTool(tools.get('read_skill_file'), {
        skill_name: 'caveman',
        file_path: 'references/guide.md',
      });
      assert.equal(readSupport.result.success, true);
      assert.equal(readSupport.result.content, 'Reference says: short words.');
      assertHasDebugStatus('read_skill_file', readSupport.statuses);

      const listRoots = await callTool(tools.get('list_skill_roots'), {});
      assert.equal(listRoots.result.success, true);
      assert.ok(listRoots.result.discoveredSkillEntrypoints.some((entry) => entry.path === 'PROMPTS/caveman/SKILL.md'));
      assertHasDebugStatus('list_skill_roots', listRoots.statuses);

      const searchRoots = await callTool(tools.get('search_skill_roots'), { pattern: 'PROMPTS/**/SKILL.md' });
      assert.equal(searchRoots.result.success, true);
      assert.equal(searchRoots.result.skillEntrypointCount, 1);
      assert.equal(searchRoots.result.discoveredSkillEntrypoints[0].path, 'PROMPTS/caveman/SKILL.md');
      assertHasDebugStatus('search_skill_roots', searchRoots.statuses);

      const blockedCommand = await callTool(tools.get('run_command'), { command: 'pwd' });
      assert.equal(blockedCommand.result.success, false);
      assert.equal(blockedCommand.result.blocked, true);
      assert.equal(blockedCommand.result.mode, 'disabled');
      assertHasDebugStatus('run_command', blockedCommand.statuses);
    } finally {
      if (originalHome === undefined) delete process.env.HOME;
      else process.env.HOME = originalHome;
    }
  });
});
