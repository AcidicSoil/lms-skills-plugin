import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pluginDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pluginDir, '..', '..');
const commandsDir = path.join(pluginDir, 'commands');
const skillPath = path.join(pluginDir, 'SKILL.md');
const readmePath = path.join(repoRoot, 'README.md');
const installScriptPath = path.join(repoRoot, 'install-pi.sh');
const installAgentsPath = path.join(repoRoot, 'install-agents.sh');
const installHermesPath = path.join(repoRoot, 'install-hermes.sh');
const installCodexPath = path.join(repoRoot, 'install-codex.sh');
const makefilePath = path.join(repoRoot, 'Makefile');
const marketplacePath = path.join(repoRoot, '.claude-plugin', 'marketplace.json');
const rootPluginJsonPath = path.join(repoRoot, '.claude-plugin', 'plugin.json');
const pluginJsonPath = path.join(pluginDir, '.claude-plugin', 'plugin.json');
const packageJsonPath = path.join(repoRoot, 'package.json');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function expectIncludes(content, snippets, label) {
  for (const snippet of snippets) {
    assert(content.includes(snippet), `${label} should include ${JSON.stringify(snippet)}`);
  }
}

function expectExcludes(content, snippets, label) {
  for (const snippet of snippets) {
    assert(!content.includes(snippet), `${label} should not include ${JSON.stringify(snippet)}`);
  }
}

const expectedCommands = [
  'audit-beagle-skill-compliance.md',
  'closeout-project-work.md',
  'execute-active-task.md',
  'execute-next-task.md',
  'generate-beagle-strategy.md',
  'generate-visual-strategy.md',
  'resume-workflow.md',
].sort();

const actualCommands = fs.readdirSync(commandsDir).filter((file) => file.endsWith('.md')).sort();
assert.deepEqual(actualCommands, expectedCommands, 'commands directory should contain only the strategy command set');

const skill = read(skillPath);
expectIncludes(skill, [
  'name: beagle-strategy',
  '# Beagle Strategy',
  'The command prompts live in `./commands/`.',
  '`generate-beagle-strategy`',
  '`execute-active-task`',
  '`execute-next-task`',
  '`audit-beagle-skill-compliance`',
  '`closeout-project-work`',
  'The default delivery model should stay browser-first.',
  'polished self-contained HTML artifact',
  'strong visual hierarchy',
  '**What aesthetic?** Pick one and commit.',
  'author: AcidicSoil',
], 'SKILL.md');
expectExcludes(skill, [
  'name: visual-explainer',
  'author: nicobailon',
], 'SKILL.md');

const readme = read(readmePath);
expectIncludes(readme, [
  '# beagle-strategy',
  'https://github.com/AcidicSoil/beagle-strategy',
  '/plugin marketplace add AcidicSoil/beagle-strategy',
  '/plugin install beagle-strategy@beagle-strategy-marketplace',
  'artifact generation as the primary delivery mode',
  'a polished browser-first HTML artifact as the main deliverable',
  'implementation plan and task list',
  'beagle-compliance-runbook.html',
  'repo-map.md',
  'repo-map.json',
  'Token-saving local scaffold workflow',
  'scaffold-strategy-template-pack.mjs',
  'npm run test:scaffold-template-pack',
  'plugins/beagle-strategy/output/beagle-integration-strategy/',
  'make codex',
  'make all',
  'cd beagle-strategy && ./install-codex.sh',
  '~/.agents/skills/beagle-strategy',
  '~/.codex/prompts',
  '/prompts:generate-visual-strategy',
  'agents-reference.md',
  'inject-agents-reference.sh',
  'plugins/beagle-strategy/.claude/CLAUDE.md',
  'AGENTS.md',
], 'README.md');
expectExcludes(readme, [
  '/generate-project-artifact-bundle',
  '/generate-conversation-artifact',
  '/generate-builder-runbook',
  '/generate-workflow-map',
  '/generate-artifact-slides',
  '/share-artifact',
  'https://github.com/AcidicSoil/visual-explainer',
  '/visual-explainer:command-name',
  '$visual-explainer',
  'plugins/visual-explainer/output/beagle-integration-strategy/',
  '/tmp/beagle-strategy/plugins/visual-explainer',
  'source of truth',
  'maintained fork',
  'legacy upstream',
], 'README.md');


const makefile = read(makefilePath);
expectIncludes(makefile, [
  '.DEFAULT_GOAL := help',
  'make all',
  'make codex',
  'make agents',
  'make hermes',
  'make pi',
  'all: agents codex hermes pi',
  './install-agents.sh',
  './install-codex.sh',
  './install-hermes.sh',
  './install-pi.sh',
], 'Makefile');

const installScript = read(installScriptPath);
expectIncludes(installScript, [
  '$HOME/.pi/agent/skills/beagle-strategy',
  'https://github.com/AcidicSoil/beagle-strategy.git',
  'PLUGIN_DIR="plugins/beagle-strategy"',
  'SKILL_PAYLOAD_DIRS=(commands scripts references schemas templates)',
  'install_skill_payload',
  'list_command_prompts()',
  'Commands available:',
  'echo "  /$prompt_file"',
  'inject-agents-reference.sh',
  'AGENTS.md',
], 'install-pi.sh');
expectExcludes(installScript, [
  '$HOME/.pi/agent/AGENTS.md',
  '.pi/AGENTS.md',
  'write_instruction_block',
  '$HOME/.pi/agent/skills/visual-explainer',
  'plugins/visual-explainer/SKILL.md',
  'cp -r plugins/visual-explainer "$SKILL_DIR"',
  'cp -r plugins/beagle-strategy "$SKILL_DIR"',
  'https://github.com/AcidicSoil/visual-explainer.git',
  'maintained fork',
  'source of truth',
  'legacy upstream',
], 'install-pi.sh');

const installAgents = read(installAgentsPath);
expectIncludes(installAgents, [
  '$HOME/.agents/skills/beagle-strategy',
  'PLUGIN_DIR="plugins/beagle-strategy"',
  'SKILL_PAYLOAD_DIRS=(commands scripts references schemas templates)',
  'install_skill_payload',
  'inject-agents-reference.sh',
  'AGENTS.md',
], 'install-agents.sh');
expectExcludes(installAgents, [
  '$HOME/.agents/AGENTS.md',
  '.agents/AGENTS.md',
  'write_instruction_block',
  'plugins/visual-explainer/SKILL.md',
  'cp -r plugins/visual-explainer "$SKILL_DIR"',
  'cp -r plugins/beagle-strategy "$SKILL_DIR"',
  'maintained fork',
  'source of truth',
], 'install-agents.sh');

const installHermes = read(installHermesPath);
expectIncludes(installHermes, [
  '$HOME/.hermes/skills/beagle-strategy',
  'PLUGIN_DIR="plugins/beagle-strategy"',
  'SKILL_PAYLOAD_DIRS=(commands scripts references schemas templates)',
  'install_skill_payload',
  'inject-agents-reference.sh',
  'AGENTS.md',
], 'install-hermes.sh');
expectExcludes(installHermes, [
  '$HOME/.hermes/HERMES.md',
  '.hermes/HERMES.md',
  'write_instruction_block',
  'plugins/visual-explainer/SKILL.md',
  'cp -r plugins/visual-explainer "$SKILL_DIR"',
  'cp -r plugins/beagle-strategy "$SKILL_DIR"',
  'maintained fork',
  'source of truth',
], 'install-hermes.sh');

const installCodex = read(installCodexPath);
expectIncludes(installCodex, [
  '$HOME/.agents/skills/beagle-strategy',
  'https://github.com/AcidicSoil/beagle-strategy.git',
  'PLUGIN_DIR="plugins/beagle-strategy"',
  'SKILL_PAYLOAD_DIRS=(commands scripts references schemas templates)',
  'list_command_prompts()',
  '$HOME/.codex/prompts',
  'install_skill_payload',
  "find \"$PLUGIN_DIR/commands\" -maxdepth 1 -type f -name '*.md' -print | sort",
  'cp "$prompt_path" "$PROMPTS_DIR/$prompt_file"',
  'inject-agents-reference.sh',
  'AGENTS.md',
], 'install-codex.sh');
expectExcludes(installCodex, [
  '$HOME/.codex/AGENTS.md',
  '.codex/AGENTS.md',
  'write_instruction_block',
  'plugins/visual-explainer/SKILL.md',
  'cp -r plugins/visual-explainer "$SKILL_DIR"',
  'cp -r plugins/beagle-strategy "$SKILL_DIR"',
  'maintained fork',
  'source of truth',
], 'install-codex.sh');

const pluginJson = JSON.parse(read(pluginJsonPath));
assert.equal(pluginJson.name, 'beagle-strategy');
assert.equal(pluginJson.repository, 'https://github.com/AcidicSoil/beagle-strategy');

const rootPluginJson = JSON.parse(read(rootPluginJsonPath));
assert.equal(rootPluginJson.name, 'beagle-strategy-marketplace');

const packageJson = JSON.parse(read(packageJsonPath));
assert.equal(packageJson.name, 'beagle-strategy');
assert.equal(packageJson.repository.url, 'https://github.com/AcidicSoil/beagle-strategy.git');
assert.equal(packageJson.homepage, 'https://github.com/AcidicSoil/beagle-strategy');
assert.equal(packageJson.scripts['render:artifact-bundle'], 'node plugins/beagle-strategy/scripts/render-artifact-bundle.mjs');
assert.equal(packageJson.scripts['validate:artifact-ir'], 'node plugins/beagle-strategy/scripts/validate-artifact-ir.mjs');

const marketplace = JSON.parse(read(marketplacePath));
assert.equal(marketplace.name, 'beagle-strategy-marketplace');
assert.equal(marketplace.plugins.length, 1);
const plugin = marketplace.plugins[0];
assert.equal(plugin.name, 'beagle-strategy');
assert.equal(plugin.repository, 'https://github.com/AcidicSoil/beagle-strategy');
assert.equal(plugin.source, './plugins/beagle-strategy');

const commandExpectations = {
  'generate-visual-strategy.md': [
    'The goal is to make a browser-first strategy bundle',
    '### 2. Classify the work',
    'collapse the strategy to exactly one active task',
    'which Beagle skills are now expected for that task',
  ],
  'execute-active-task.md': [
    'force the Beagle skills mapped to that task before you begin',
    'Treat the scenario as routing only.',
    'Do not fall back to generic workflow behavior',
    'which Beagle skills were forced for it',
  ],
  'resume-workflow.md': [
    'resume the Beagle workflow from the current task state',
    'Do not treat the workflow as a broad scenario review.',
    'only advance to the next task when the current one is complete or clearly blocked',
    'which Beagle skills are now in force for that task',
  ],
};

for (const [file, snippets] of Object.entries(commandExpectations)) {
  const filePath = path.join(commandsDir, file);
  assert(fs.existsSync(filePath), `Expected command file: ${file}`);
  expectIncludes(read(filePath), snippets, file);
}

console.log('Command surface checks passed.');
