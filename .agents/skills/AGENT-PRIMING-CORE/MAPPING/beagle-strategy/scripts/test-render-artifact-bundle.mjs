import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createSampleArtifactIR } from './sample-artifact-ir.mjs';
import { renderArtifactBundle } from './render-artifact-bundle.mjs';

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertIncludes(haystack, needle, label) {
  assert(haystack.includes(needle), `${label} should include ${JSON.stringify(needle)}`);
}

function clone(value) {
  return structuredClone(value);
}

const outputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'beagle-strategy-'));
const result = renderArtifactBundle(createSampleArtifactIR(), outputRoot);

for (const file of Object.values(result.files)) {
  assert(fs.existsSync(path.join(result.bundle_dir, file)), `Expected rendered file: ${file}`);
}

const strategyHtml = read(path.join(result.bundle_dir, result.files.strategy_html));
const complianceHtml = read(path.join(result.bundle_dir, result.files.compliance_runbook_html));
const gatesMd = read(path.join(result.bundle_dir, result.files.agent_gates_md));
const workflowsHtml = read(path.join(result.bundle_dir, result.files.scenario_workflows_html));
const skillMapping = JSON.parse(read(path.join(result.bundle_dir, result.files.skill_mapping_json)));
const implementationPlan = read(path.join(result.bundle_dir, result.files.implementation_plan_md));
const repoMapMd = read(path.join(result.bundle_dir, result.files.repo_map_md));
const repoMapJson = JSON.parse(read(path.join(result.bundle_dir, result.files.repo_map_json)));
const agentInstructionBlock = read(path.join(result.bundle_dir, result.files.agent_instruction_block_md));
const agentInstructionTargets = JSON.parse(read(path.join(result.bundle_dir, result.files.agent_instruction_targets_json)));
const agentsReference = read(path.join(result.bundle_dir, result.files.agents_reference_md));
const manifest = JSON.parse(read(path.join(result.bundle_dir, result.files.strategy_manifest_json)));

assertIncludes(strategyHtml, 'Browser-first artifact', 'strategy html');
assertIncludes(strategyHtml, 'Repo grounding', 'strategy html');
assertIncludes(strategyHtml, 'Evidence and provenance', 'strategy html');
assertIncludes(strategyHtml, 'src/runtime/execution.py', 'strategy html');
assertIncludes(strategyHtml, 'Default verification commands', 'strategy html');
assertIncludes(strategyHtml, 'Select repo-governing Beagle skills', 'strategy html');
assertIncludes(strategyHtml, 'Guardrails, decisions, and next steps', 'strategy html');
assertIncludes(strategyHtml, 'table of contents', 'strategy html');
assertIncludes(complianceHtml, 'Compliance summary', 'compliance runbook html');
assertIncludes(complianceHtml, 'Chosen skill compliance matrix', 'compliance runbook html');
assertIncludes(complianceHtml, 'Runbook posture', 'compliance runbook html');
assertIncludes(complianceHtml, 'Phase and task board', 'compliance runbook html');
assertIncludes(complianceHtml, 'Per-scenario audit lanes', 'compliance runbook html');
assertIncludes(complianceHtml, 'Execution readiness queue', 'compliance runbook html');
assertIncludes(gatesMd, 'Do this before work starts', 'agent gates markdown');
assertIncludes(gatesMd, 'Every execution note must include', 'agent gates markdown');
assertIncludes(gatesMd, 'npm run test:artifact-bundle', 'agent gates markdown');
assertIncludes(workflowsHtml, 'Workflow Map', 'scenario workflows html');
assertIncludes(workflowsHtml, 'Scenario lanes', 'scenario workflows html');
assertIncludes(workflowsHtml, 'Execution gates', 'scenario workflows html');
assertIncludes(workflowsHtml, 'Verification baseline', 'scenario workflows html');
assertIncludes(workflowsHtml, 'npm run validate:artifact-ir', 'scenario workflows html');
assertIncludes(workflowsHtml, 'id="toc"', 'scenario workflows html');
assert.equal(skillMapping.target_project, 'ExampleRepo', 'skill mapping should preserve target project');
assert.equal(skillMapping.skill_mapping.length, 5, 'skill mapping should preserve number of mapping groups');
assert.equal(skillMapping.chosen_skills.length, 5, 'skill mapping json should include chosen skills');
assert.equal(skillMapping.scenarios.length, 5, 'skill mapping json should include scenarios');
assertIncludes(implementationPlan, '## Verified facts', 'implementation plan markdown');
assertIncludes(implementationPlan, '## Inferred conclusions', 'implementation plan markdown');
assertIncludes(implementationPlan, '- Exit criteria:', 'implementation plan markdown');
assertIncludes(repoMapMd, 'Repo Map', 'repo map markdown');
assertIncludes(repoMapMd, 'Priority surfaces', 'repo map markdown');
assert.equal(repoMapJson.priority_surfaces.length > 0, true, 'repo map json should include priority surfaces');
assertIncludes(implementationPlan, '## Residual risks', 'implementation plan markdown');
assertIncludes(agentInstructionBlock, 'Artifact precedence and source of truth', 'agent instruction block markdown');
assertIncludes(agentInstructionBlock, 'Mandatory behavior before implementation', 'agent instruction block markdown');
assertIncludes(agentInstructionBlock, 'Anti-drift rules', 'agent instruction block markdown');
assert.equal(agentInstructionTargets.targets.codex.default_target_file, '.codex/AGENTS.md', 'agent instruction targets should include codex target');
assert.equal(agentInstructionTargets.targets.hermes.default_target_file, 'HERMES.md', 'agent instruction targets should include hermes target');
assertIncludes(agentsReference, 'Beagle Strategy Artifact References', 'agents reference markdown');
assertIncludes(agentsReference, 'Primary drop-in deliverables', 'agents reference markdown');
assertIncludes(agentsReference, 'agent-instruction-block.md', 'agents reference markdown');
assertIncludes(agentsReference, 'compact artifact index', 'agents reference markdown');
assert.equal(manifest.counts.repo_grounding_surfaces, 4, 'manifest should count repo grounding surfaces');
assert.equal(manifest.counts.verified_facts, 3, 'manifest should count verified facts');
assert.equal(manifest.counts.implementation_tasks, 6, 'manifest should count implementation tasks');
assert.equal(manifest.files.compliance_runbook_html, 'beagle-compliance-runbook.html', 'manifest should include the compliance runbook html');
assert.equal(manifest.files.agent_instruction_block_md, 'agent-instruction-block.md', 'manifest should include the canonical instruction block');
assert.equal(manifest.files.agent_instruction_targets_json, 'agent-instruction-targets.json', 'manifest should include target-aware instruction rules');
assert.equal(manifest.files.agents_reference_md, 'agents-reference.md', 'manifest should include the agents reference markdown');
assert.equal(manifest.files.repo_map_md, 'repo-map.md', 'manifest should include the repo map markdown');
assert.equal(manifest.files.repo_map_json, 'repo-map.json', 'manifest should include the repo map json');

const liveRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'beagle-strategy-live-repo-'));
fs.mkdirSync(path.join(liveRepoRoot, 'src', 'runtime'), { recursive: true });
fs.mkdirSync(path.join(liveRepoRoot, 'config'), { recursive: true });
fs.mkdirSync(path.join(liveRepoRoot, 'scripts'), { recursive: true });
fs.writeFileSync(path.join(liveRepoRoot, 'README.md'), '# Example live repo\n', 'utf8');
fs.writeFileSync(path.join(liveRepoRoot, 'src', 'runtime', 'execution.py'), 'def run():\n    return True\n', 'utf8');
fs.writeFileSync(path.join(liveRepoRoot, 'config', 'settings.yaml'), 'enabled: true\n', 'utf8');
fs.writeFileSync(path.join(liveRepoRoot, 'scripts', 'build.sh'), '#!/usr/bin/env bash\necho ok\n', { encoding: 'utf8', mode: 0o755 });

const liveDocument = clone(createSampleArtifactIR());
liveDocument.target_project.repo_path = liveRepoRoot;
liveDocument.repo_grounding.summary = 'Minimal repo grounding before live-map enrichment.';
liveDocument.repo_grounding.inspected_surfaces = [
  {
    path: 'README.md',
    kind: 'docs',
    finding: 'Starting seed surface before live repo-map enrichment.',
  },
];

const liveOutputRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'beagle-strategy-live-output-'));
const liveResult = renderArtifactBundle(liveDocument, liveOutputRoot);
const liveRepoMapJson = JSON.parse(read(path.join(liveResult.bundle_dir, liveResult.files.repo_map_json)));
assert.equal(liveRepoMapJson.source, 'filesystem', 'live repo map should come from filesystem scanning');
assert(liveResult.normalized.repo_grounding.inspected_surfaces.length > 1, 'live repo render should enrich repo grounding surfaces from the repo map');
assert(liveResult.normalized.repo_grounding.summary.includes('Auto-enriched with'), 'live repo render should note repo grounding enrichment');
assert(liveResult.normalized.repo_grounding.inspected_surfaces.some((surface) => surface.path === 'src/runtime/execution.py'), 'live repo render should pull in mapped runtime surfaces');
assert(liveResult.normalized.repo_grounding.inspected_surfaces.some((surface) => surface.path === 'config/settings.yaml'), 'live repo render should pull in mapped config surfaces');



const injectRepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'beagle-strategy-inject-'));
const targetAgents = path.join(injectRepoRoot, 'AGENTS.md');
fs.writeFileSync(targetAgents, '# Local instructions\n\nKeep this content.\n', 'utf8');
const injectorScript = path.resolve('plugins/beagle-strategy/scripts/inject-agents-reference.sh');
execFileSync(injectorScript, [result.bundle_dir, targetAgents], { encoding: 'utf8' });
const injectedAgents = read(targetAgents);
assertIncludes(injectedAgents, 'BEGIN beagle-strategy:managed-block target=agents version=1.0', 'agents injection output');
assertIncludes(injectedAgents, '## Beagle Strategy', 'agents injection output');
assertIncludes(injectedAgents, 'Keep this content.', 'agents injection output');
execFileSync(injectorScript, [result.bundle_dir, targetAgents], { encoding: 'utf8' });
const reinjectedAgents = read(targetAgents);
assert.equal((reinjectedAgents.match(/BEGIN beagle-strategy:managed-block/g) || []).length, 1, 'reinjection should keep exactly one managed block');

const codexTarget = path.join(injectRepoRoot, '.codex', 'AGENTS.md');
execFileSync(injectorScript, [result.bundle_dir, codexTarget], { encoding: 'utf8' });
const codexInjected = read(codexTarget);
assertIncludes(codexInjected, 'target=codex version=1.0', 'codex injection output');
assertIncludes(codexInjected, 'For Codex, the managed Beagle Strategy block below is mandatory repo intake.', 'codex injection output');

console.log('Beagle strategy bundle rendering checks passed.');
