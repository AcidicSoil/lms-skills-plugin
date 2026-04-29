import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.resolve(__dirname, '../templates');

function read(relativePath) {
  return fs.readFileSync(path.join(templatesDir, relativePath), 'utf8');
}

const expectedTemplates = [
  'beagle-compliance-runbook.html',
  'beagle-integration-strategy.html',
  'scenario-workflows.html',
].sort();

const actualTemplates = fs.readdirSync(templatesDir).filter((file) => file.endsWith('.html')).sort();
for (const template of expectedTemplates) {
  assert(actualTemplates.includes(template), `templates directory should include ${template}`);
}

const strategyTemplate = read('beagle-integration-strategy.html');
assert(strategyTemplate.includes('Browser-first artifact'), 'strategy template should describe the browser-first delivery model');
assert(strategyTemplate.includes('{{BEAGLE_SHARED_HEAD}}'), 'strategy template should include the shared Beagle shell head partial');
assert(strategyTemplate.includes('{{REPO_GROUNDING_HTML}}'), 'strategy template should render repo grounding');
assert(strategyTemplate.includes('{{VERIFIED_FACTS_HTML}}'), 'strategy template should render verified facts');
assert(strategyTemplate.includes('{{INFERRED_CONCLUSIONS_HTML}}'), 'strategy template should render inferred conclusions');
assert(strategyTemplate.includes('{{FOLLOW_UPS_HTML}}'), 'strategy template should render follow-ups');
assert(strategyTemplate.includes('{{RESIDUAL_RISKS_HTML}}'), 'strategy template should render residual risks');
assert(strategyTemplate.includes('{{SCENARIO_FLOW_HTML}}'), 'strategy template should render scenario flow lanes');
assert(strategyTemplate.includes('table of contents'), 'strategy template should expose responsive section navigation');
assert(strategyTemplate.includes('id="evidence"'), 'strategy template should expose an evidence section');
assert(strategyTemplate.includes('id="grounding"'), 'strategy template should expose a repo grounding section');

const sharedHeadTemplate = read('partials/beagle-shell-head.html');
assert(sharedHeadTemplate.includes('.beagle-shell-frame'), 'shared head partial should define the shell frame primitive');
assert(sharedHeadTemplate.includes('.beagle-chip'), 'shared head partial should define shared chip styling');
assert(sharedHeadTemplate.includes('.beagle-lane-grid'), 'shared head partial should define shared lane-grid styling');
assert(sharedHeadTemplate.includes('.toc'), 'shared head partial should define responsive navigation styling');
assert(sharedHeadTemplate.includes('.ve-card'), 'shared head partial should define visual-explainer card primitives');
assert(sharedHeadTemplate.includes('.page-progress'), 'shared head partial should define the slide-inspired progress chrome');
assert(sharedHeadTemplate.includes('.mermaid-wrap'), 'shared head partial should include optional library-aware diagram styling');

const workflowsTemplate = read('scenario-workflows.html');
assert(workflowsTemplate.includes('{{BEAGLE_SHARED_HEAD}}'), 'workflow template should include the shared Beagle shell head partial');
assert(workflowsTemplate.includes('{{TITLE}}'), 'workflow template should render a title placeholder');
assert(workflowsTemplate.includes('{{SUBTITLE}}'), 'workflow template should render a subtitle placeholder');
assert(workflowsTemplate.includes('{{SCENARIO_LANES}}'), 'workflow template should render scenario lanes');
assert(workflowsTemplate.includes('{{SCENARIO_GATES}}'), 'workflow template should render execution gates');
assert(workflowsTemplate.includes('{{VERIFICATION_COMMANDS}}'), 'workflow template should render verification commands');
assert(workflowsTemplate.includes('table of contents'), 'workflow template should expose responsive section navigation');

const complianceTemplate = read('beagle-compliance-runbook.html');
assert(complianceTemplate.includes('{{BEAGLE_SHARED_HEAD}}'), 'compliance template should include the shared Beagle shell head partial');
assert(complianceTemplate.includes('Compliance summary'), 'compliance template should include the summary section');
assert(complianceTemplate.includes('{{COMPLIANCE_ROWS}}'), 'compliance template should render compliance rows');
assert(complianceTemplate.includes('{{PHASE_TASK_BOARD}}'), 'compliance template should render the phase task board');
assert(complianceTemplate.includes('{{SCENARIO_AUDIT_LANES}}'), 'compliance template should render scenario audit lanes');
assert(complianceTemplate.includes('{{ACTION_QUEUE}}'), 'compliance template should render the action queue');
assert(complianceTemplate.includes('table of contents'), 'compliance template should expose responsive section navigation');

console.log('Template checks passed.');
