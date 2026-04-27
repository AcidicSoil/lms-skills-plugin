import assert from 'node:assert/strict';

import { createSampleArtifactIR } from './sample-artifact-ir.mjs';
import { validateArtifactIR } from './validate-artifact-ir.mjs';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectInvalid(label, fixture) {
  const result = validateArtifactIR(fixture);
  assert.equal(result.valid, false, `${label} should fail validation`);
  return result.errors;
}

const fixture = createSampleArtifactIR();
const result = validateArtifactIR(fixture);
assert.equal(result.valid, true, `sample artifact should validate successfully: ${result.errors.join('; ')}`);

const missingRepoGrounding = clone(fixture);
delete missingRepoGrounding.repo_grounding;
assert(
  expectInvalid('missing repo grounding', missingRepoGrounding).some((error) => error.includes('repo_grounding')),
  'missing repo grounding should report repo_grounding',
);

const missingScenarioVerification = clone(fixture);
missingScenarioVerification.scenarios[0].verification = [];
assert(
  expectInvalid('missing scenario verification', missingScenarioVerification).some((error) => error.includes('scenarios[0].verification')),
  'missing scenario verification should report scenarios[0].verification',
);

const badChosenSkillId = clone(fixture);
badChosenSkillId.chosen_skills[0].skill_id = 'review-plan';
assert(
  expectInvalid('bad chosen skill id', badChosenSkillId).some((error) => error.includes('chosen_skills[0].skill_id')),
  'bad chosen skill id should report chosen_skills[0].skill_id',
);

const missingEvidenceModel = clone(fixture);
delete missingEvidenceModel.evidence_model;
assert(
  expectInvalid('missing evidence model', missingEvidenceModel).some((error) => error.includes('evidence_model')),
  'missing evidence model should report evidence_model',
);

const missingResidualRisks = clone(fixture);
missingResidualRisks.evidence_model.residual_risks = [];
assert(
  expectInvalid('missing residual risks', missingResidualRisks).some((error) => error.includes('evidence_model.residual_risks')),
  'missing residual risks should report evidence_model.residual_risks',
);

console.log('BeagleStrategyIR sample validation checks passed.');
