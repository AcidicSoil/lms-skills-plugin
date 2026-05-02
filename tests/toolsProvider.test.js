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
    await fs.mkdir(path.join(skillsRoot, 'PROMPTS', 'example-skill', 'references'), { recursive: true });
    await fs.mkdir(path.join(fakeHome, '.lmstudio', 'plugin-data', 'lms-skills'), { recursive: true });
    await fs.writeFile(
      path.join(skillsRoot, 'PROMPTS', 'example-skill', 'SKILL.md'),
      [
        '---',
        'name: example-skill',
        'description: Generic fixture helper.',
        'tags: [example, fixture]',
        '---',
        '',
        '# Example Skill',
        '',
        'Use the example fixture workflow.',
        '',
      ].join('\n'),
      'utf8',
    );
    await fs.writeFile(
      path.join(skillsRoot, 'PROMPTS', 'example-skill', 'references', 'guide.md'),
      'Reference says: use fixture details.',
      'utf8',
    );
    await fs.mkdir(path.join(skillsRoot, 'PROMPTS', 'prompt-engineering'), { recursive: true });
    await fs.writeFile(
      path.join(skillsRoot, 'PROMPTS', 'prompt-engineering', 'SKILL.md'),
      [
        '---',
        'name: prompt-engineering',
        'description: Helps craft, improve, and evaluate prompts.',
        'tags: [prompts, writing]',
        '---',
        '',
        '# Prompt Engineering',
        '',
        'Use this skill to craft prompts.',
        '',
      ].join('\n'),
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
        'edit_file',
        'list_skill_files',
        'list_skill_roots',
        'list_skills',
        'read_file',
        'read_skill_file',
        'run_command',
        'search_skill_roots',
        'write_file',
      ]);

      const list = await callTool(tools.get('list_skills'), { query: 'example-skill' });
      assert.equal(list.result.found, 1);
      assert.equal(list.result.skills[0].name, 'example-skill');
      assertHasDebugStatus('list_skills', list.statuses);
      assert.ok(list.statuses.some((message) => message.includes('resolving skill roots')));
      assert.ok(list.statuses.some((message) => message.includes('checking exact skill match')));
      assert.equal(list.warnings.length, 0);

      const readSkill = await callTool(tools.get('read_skill_file'), { skill_name: 'example-skill' });
      assert.equal(readSkill.result.success, true);
      assert.equal(readSkill.result.skill, 'example-skill');
      assert.match(readSkill.result.content, /Use the example fixture workflow/);
      assert.doesNotMatch(readSkill.result.content, /^---/);
      assertHasDebugStatus('read_skill_file', readSkill.statuses);

      const promptSearch = await callTool(tools.get('list_skills'), { query: 'prompts' });
      assert.equal(promptSearch.result.found >= 1, true);
      assert.equal(promptSearch.result.skills[0].name, 'prompt-engineering');
      assert.equal(promptSearch.result.mode, 'fuzzy');
      assert.match(promptSearch.result.note, /Fast fuzzy skill-name candidates/);
      assertHasDebugStatus('list_skills', promptSearch.statuses);

      const listFiles = await callTool(tools.get('list_skill_files'), { skill_name: 'example-skill' });
      assert.equal(listFiles.result.success, true);
      assert.ok(listFiles.result.entries.some((entry) => entry.path === 'SKILL.md'));
      assert.ok(listFiles.result.entries.some((entry) => entry.path === 'references/guide.md'));
      assertHasDebugStatus('list_skill_files', listFiles.statuses);

      const readSupport = await callTool(tools.get('read_skill_file'), {
        skill_name: 'example-skill',
        file_path: 'references/guide.md',
      });
      assert.equal(readSupport.result.success, true);
      assert.equal(readSupport.result.content, 'Reference says: use fixture details.');
      assertHasDebugStatus('read_skill_file', readSupport.statuses);

      const absoluteGuidePath = path.join(skillsRoot, 'PROMPTS', 'example-skill', 'references', 'guide.md');
      const readFile = await callTool(tools.get('read_file'), { file_path: absoluteGuidePath });
      assert.equal(readFile.result.success, true);
      assert.equal(readFile.result.content, 'Reference says: use fixture details.');
      assertHasDebugStatus('read_file', readFile.statuses);

      const blockedWrite = await callTool(tools.get('write_file'), {
        file_path: path.join(skillsRoot, 'PROMPTS', 'example-skill', 'notes.md'),
        content: 'new note',
      });
      assert.equal(blockedWrite.result.success, false);
      assert.equal(blockedWrite.result.blocked, true);
      assertHasDebugStatus('write_file', blockedWrite.statuses);

      const blockedEdit = await callTool(tools.get('edit_file'), {
        file_path: absoluteGuidePath,
        old_text: 'fixture',
        new_text: 'updated fixture',
      });
      assert.equal(blockedEdit.result.success, false);
      assert.equal(blockedEdit.result.blocked, true);
      assertHasDebugStatus('edit_file', blockedEdit.statuses);

      const listRoots = await callTool(tools.get('list_skill_roots'), {});
      assert.equal(listRoots.result.success, true);
      assert.ok(listRoots.result.discoveredSkillEntrypoints.some((entry) => entry.path === 'PROMPTS/example-skill/SKILL.md'));
      assertHasDebugStatus('list_skill_roots', listRoots.statuses);

      const searchRoots = await callTool(tools.get('search_skill_roots'), { pattern: 'PROMPTS/**/SKILL.md' });
      assert.equal(searchRoots.result.success, true);
      assert.equal(searchRoots.result.skillEntrypointCount, 2);
      assert.ok(searchRoots.result.discoveredSkillEntrypoints.some((entry) => entry.path === 'PROMPTS/example-skill/SKILL.md'));
      assert.ok(searchRoots.result.discoveredSkillEntrypoints.some((entry) => entry.path === 'PROMPTS/prompt-engineering/SKILL.md'));
      assertHasDebugStatus('search_skill_roots', searchRoots.statuses);

      const promptRootSearch = await callTool(tools.get('search_skill_roots'), { pattern: 'writing prompts' });
      assert.equal(promptRootSearch.result.success, true);
      const promptEntrypoint = promptRootSearch.result.discoveredSkillEntrypoints.find(
        (entry) => entry.path === 'PROMPTS/prompt-engineering/SKILL.md',
      );
      assert.ok(promptEntrypoint);
      assert.equal(promptEntrypoint.skillDirectoryPath, 'PROMPTS/prompt-engineering');
      assert.equal(promptEntrypoint.skillNameCandidate, 'prompt-engineering');
      assert.deepEqual(promptEntrypoint.readSkillFileArgs, { skill_name: 'prompt-engineering' });
      assert.match(promptEntrypoint.note, /Do not pass this SKILL\.md path as file_path/);

      const readPromptFromEntrypoint = await callTool(tools.get('read_skill_file'), promptEntrypoint.readSkillFileArgs);
      assert.equal(readPromptFromEntrypoint.result.success, true);
      assert.equal(readPromptFromEntrypoint.result.skill, 'prompt-engineering');
      assert.match(readPromptFromEntrypoint.result.content, /Use this skill to craft prompts/);

      const readPromptFromBadFollowup = await callTool(tools.get('read_skill_file'), {
        skill_name: 'PROMPTS/prompt-engineering',
        file_path: 'PROMPTS/prompt-engineering/SKILL.md',
      });
      assert.equal(readPromptFromBadFollowup.result.success, true);
      assert.equal(readPromptFromBadFollowup.result.skill, 'prompt-engineering');
      assert.match(readPromptFromBadFollowup.result.content, /Use this skill to craft prompts/);

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
