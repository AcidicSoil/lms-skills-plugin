import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const STRATEGY_TYPES = new Set(['beagle_integration_strategy']);
const INSTALLATION_SCOPES = new Set(['agents_only']);
const CANONICAL_SKILL_ID = /^beagle-[a-z0-9]+:[a-z0-9][a-z0-9-]*$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushError(errors, pathName, message) {
  errors.push(`${pathName}: ${message}`);
}

function requireNonEmptyString(value, pathName, errors) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushError(errors, pathName, 'must be a non-empty string');
    return false;
  }
  return true;
}

function requireArray(value, pathName, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    pushError(errors, pathName, 'must be a non-empty array');
    return false;
  }
  return true;
}

function validateStringArray(value, pathName, errors) {
  if (!requireArray(value, pathName, errors)) {
    return;
  }

  value.forEach((item, index) => requireNonEmptyString(item, `${pathName}[${index}]`, errors));
}

function validateMeta(meta, errors) {
  if (!isObject(meta)) {
    pushError(errors, 'meta', 'must be an object');
    return;
  }

  requireNonEmptyString(meta.title, 'meta.title', errors);
  requireNonEmptyString(meta.subtitle, 'meta.subtitle', errors);
  requireNonEmptyString(meta.created_at, 'meta.created_at', errors);
  requireNonEmptyString(meta.source_project, 'meta.source_project', errors);
  requireNonEmptyString(meta.strategy_id, 'meta.strategy_id', errors);
}

function validateSourceInputs(sourceInputs, errors) {
  if (!requireArray(sourceInputs, 'source_inputs', errors)) {
    return;
  }

  sourceInputs.forEach((item, index) => {
    const base = `source_inputs[${index}]`;
    if (!isObject(item)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(item.id, `${base}.id`, errors);
    requireNonEmptyString(item.kind, `${base}.kind`, errors);
    requireNonEmptyString(item.label, `${base}.label`, errors);
    requireNonEmptyString(item.summary, `${base}.summary`, errors);
    if (item.path !== undefined) {
      requireNonEmptyString(item.path, `${base}.path`, errors);
    }
  });
}

function validateTargetProject(targetProject, errors) {
  if (!isObject(targetProject)) {
    pushError(errors, 'target_project', 'must be an object');
    return;
  }

  requireNonEmptyString(targetProject.name, 'target_project.name', errors);
  requireNonEmptyString(targetProject.summary, 'target_project.summary', errors);
  if (targetProject.primary_language !== undefined) {
    requireNonEmptyString(targetProject.primary_language, 'target_project.primary_language', errors);
  }
  if (targetProject.repo_path !== undefined) {
    requireNonEmptyString(targetProject.repo_path, 'target_project.repo_path', errors);
  }
}

function validateOperatingModel(operatingModel, errors) {
  if (!isObject(operatingModel)) {
    pushError(errors, 'operating_model', 'must be an object');
    return;
  }

  requireNonEmptyString(operatingModel.summary, 'operating_model.summary', errors);
  validateStringArray(operatingModel.principles, 'operating_model.principles', errors);
}

function validateInstallation(installation, errors) {
  if (!isObject(installation)) {
    pushError(errors, 'installation', 'must be an object');
    return;
  }

  requireNonEmptyString(installation.summary, 'installation.summary', errors);
  if (!INSTALLATION_SCOPES.has(installation.scope)) {
    pushError(errors, 'installation.scope', `must be one of: ${Array.from(INSTALLATION_SCOPES).join(', ')}`);
  }
  validateStringArray(installation.steps, 'installation.steps', errors);
}

function validateRepoGrounding(repoGrounding, errors) {
  if (!isObject(repoGrounding)) {
    pushError(errors, 'repo_grounding', 'must be an object');
    return;
  }

  requireNonEmptyString(repoGrounding.summary, 'repo_grounding.summary', errors);
  if (!requireArray(repoGrounding.inspected_surfaces, 'repo_grounding.inspected_surfaces', errors)) {
    return;
  }

  repoGrounding.inspected_surfaces.forEach((surface, index) => {
    const base = `repo_grounding.inspected_surfaces[${index}]`;
    if (!isObject(surface)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(surface.path, `${base}.path`, errors);
    requireNonEmptyString(surface.kind, `${base}.kind`, errors);
    requireNonEmptyString(surface.finding, `${base}.finding`, errors);
  });
}

function validateGates(gates, errors) {
  if (!requireArray(gates, 'mandatory_gates', errors)) {
    return;
  }

  gates.forEach((gate, index) => {
    const base = `mandatory_gates[${index}]`;
    if (!isObject(gate)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(gate.id, `${base}.id`, errors);
    requireNonEmptyString(gate.title, `${base}.title`, errors);
    requireNonEmptyString(gate.when, `${base}.when`, errors);
    validateStringArray(gate.skills, `${base}.skills`, errors);
    requireNonEmptyString(gate.target_focus, `${base}.target_focus`, errors);
    requireNonEmptyString(gate.outcome, `${base}.outcome`, errors);
  });
}

function validateScenarios(scenarios, errors) {
  if (!requireArray(scenarios, 'scenarios', errors)) {
    return;
  }

  scenarios.forEach((scenario, index) => {
    const base = `scenarios[${index}]`;
    if (!isObject(scenario)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(scenario.id, `${base}.id`, errors);
    requireNonEmptyString(scenario.title, `${base}.title`, errors);
    requireNonEmptyString(scenario.when, `${base}.when`, errors);
    validateStringArray(scenario.steps, `${base}.steps`, errors);
    requireNonEmptyString(scenario.target_focus, `${base}.target_focus`, errors);
    validateStringArray(scenario.repo_surfaces, `${base}.repo_surfaces`, errors);
    validateStringArray(scenario.governing_skills, `${base}.governing_skills`, errors);
    validateStringArray(scenario.required_artifacts, `${base}.required_artifacts`, errors);
    validateStringArray(scenario.verification, `${base}.verification`, errors);
    validateStringArray(scenario.acceptance_criteria, `${base}.acceptance_criteria`, errors);
    requireNonEmptyString(scenario.outcome, `${base}.outcome`, errors);
  });
}

function validateSkillMapping(skillMapping, errors) {
  if (!requireArray(skillMapping, 'skill_mapping', errors)) {
    return;
  }

  skillMapping.forEach((mapping, index) => {
    const base = `skill_mapping[${index}]`;
    if (!isObject(mapping)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(mapping.skill_group, `${base}.skill_group`, errors);
    requireNonEmptyString(mapping.use_for, `${base}.use_for`, errors);
    validateStringArray(mapping.project_surfaces, `${base}.project_surfaces`, errors);
    requireNonEmptyString(mapping.why, `${base}.why`, errors);
    if (mapping.avoid_when !== undefined) {
      requireNonEmptyString(mapping.avoid_when, `${base}.avoid_when`, errors);
    }
  });
}

function validateChosenSkills(chosenSkills, errors) {
  if (!requireArray(chosenSkills, 'chosen_skills', errors)) {
    return;
  }

  chosenSkills.forEach((skill, index) => {
    const base = `chosen_skills[${index}]`;
    if (!isObject(skill)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    if (requireNonEmptyString(skill.skill_id, `${base}.skill_id`, errors) && !CANONICAL_SKILL_ID.test(skill.skill_id)) {
      pushError(errors, `${base}.skill_id`, 'must match canonical beagle-<group>:<skill> format');
    }
    requireNonEmptyString(skill.use_when, `${base}.use_when`, errors);
    validateStringArray(skill.project_surfaces, `${base}.project_surfaces`, errors);
    requireNonEmptyString(skill.why_chosen, `${base}.why_chosen`, errors);
    validateStringArray(skill.audit_expectations, `${base}.audit_expectations`, errors);
  });
}

function validateEvidenceStatements(items, pathName, errors) {
  if (!requireArray(items, pathName, errors)) {
    return;
  }

  items.forEach((item, index) => {
    const base = `${pathName}[${index}]`;
    if (!isObject(item)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(item.id, `${base}.id`, errors);
    requireNonEmptyString(item.statement, `${base}.statement`, errors);
    requireNonEmptyString(item.evidence, `${base}.evidence`, errors);
  });
}

function validateFollowUps(items, errors) {
  if (!requireArray(items, 'evidence_model.recommended_follow_ups', errors)) {
    return;
  }

  items.forEach((item, index) => {
    const base = `evidence_model.recommended_follow_ups[${index}]`;
    if (!isObject(item)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(item.id, `${base}.id`, errors);
    requireNonEmptyString(item.action, `${base}.action`, errors);
    if (item.owner !== undefined) {
      requireNonEmptyString(item.owner, `${base}.owner`, errors);
    }
  });
}

function validateResidualRisks(items, errors) {
  if (!requireArray(items, 'evidence_model.residual_risks', errors)) {
    return;
  }

  items.forEach((item, index) => {
    const base = `evidence_model.residual_risks[${index}]`;
    if (!isObject(item)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(item.id, `${base}.id`, errors);
    requireNonEmptyString(item.statement, `${base}.statement`, errors);
    if (item.mitigation !== undefined) {
      requireNonEmptyString(item.mitigation, `${base}.mitigation`, errors);
    }
  });
}

function validateEvidenceModel(evidenceModel, errors) {
  if (!isObject(evidenceModel)) {
    pushError(errors, 'evidence_model', 'must be an object');
    return;
  }

  validateStringArray(evidenceModel.default_verification_commands, 'evidence_model.default_verification_commands', errors);
  validateEvidenceStatements(evidenceModel.verified_facts, 'evidence_model.verified_facts', errors);
  validateEvidenceStatements(evidenceModel.inferred_conclusions, 'evidence_model.inferred_conclusions', errors);
  validateFollowUps(evidenceModel.recommended_follow_ups, errors);
  validateResidualRisks(evidenceModel.residual_risks, errors);
}

function validateImplementationPlan(plan, errors) {
  if (!isObject(plan)) {
    pushError(errors, 'implementation_plan', 'must be an object');
    return;
  }

  requireNonEmptyString(plan.summary, 'implementation_plan.summary', errors);
  if (!requireArray(plan.phases, 'implementation_plan.phases', errors)) {
    return;
  }

  plan.phases.forEach((phase, index) => {
    const base = `implementation_plan.phases[${index}]`;
    if (!isObject(phase)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(phase.id, `${base}.id`, errors);
    requireNonEmptyString(phase.title, `${base}.title`, errors);
    requireNonEmptyString(phase.goal, `${base}.goal`, errors);
    validateStringArray(phase.deliverables, `${base}.deliverables`, errors);
    validateStringArray(phase.required_skills, `${base}.required_skills`, errors);
    validateStringArray(phase.exit_criteria, `${base}.exit_criteria`, errors);
  });
}

function validateImplementationTasks(tasks, errors) {
  if (!requireArray(tasks, 'implementation_tasks', errors)) {
    return;
  }

  tasks.forEach((task, index) => {
    const base = `implementation_tasks[${index}]`;
    if (!isObject(task)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(task.id, `${base}.id`, errors);
    requireNonEmptyString(task.phase_id, `${base}.phase_id`, errors);
    requireNonEmptyString(task.title, `${base}.title`, errors);
    requireNonEmptyString(task.summary, `${base}.summary`, errors);
    validateStringArray(task.required_skills, `${base}.required_skills`, errors);
    validateStringArray(task.acceptance_criteria, `${base}.acceptance_criteria`, errors);
    if (task.status !== undefined) {
      requireNonEmptyString(task.status, `${base}.status`, errors);
    }
  });
}

function validateAntiGoals(antiGoals, errors) {
  if (!requireArray(antiGoals, 'anti_goals', errors)) {
    return;
  }

  antiGoals.forEach((antiGoal, index) => {
    const base = `anti_goals[${index}]`;
    if (!isObject(antiGoal)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(antiGoal.id, `${base}.id`, errors);
    requireNonEmptyString(antiGoal.statement, `${base}.statement`, errors);
  });
}

function validateDecisions(decisions, errors) {
  if (!requireArray(decisions, 'decisions', errors)) {
    return;
  }

  decisions.forEach((decision, index) => {
    const base = `decisions[${index}]`;
    if (!isObject(decision)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(decision.id, `${base}.id`, errors);
    requireNonEmptyString(decision.statement, `${base}.statement`, errors);
    requireNonEmptyString(decision.rationale, `${base}.rationale`, errors);
  });
}

function validateNextSteps(nextSteps, errors) {
  if (!requireArray(nextSteps, 'next_steps', errors)) {
    return;
  }

  nextSteps.forEach((step, index) => {
    const base = `next_steps[${index}]`;
    if (!isObject(step)) {
      pushError(errors, base, 'must be an object');
      return;
    }

    requireNonEmptyString(step.id, `${base}.id`, errors);
    requireNonEmptyString(step.title, `${base}.title`, errors);
    requireNonEmptyString(step.owner, `${base}.owner`, errors);
    if (step.status !== undefined) {
      requireNonEmptyString(step.status, `${base}.status`, errors);
    }
  });
}

export function validateArtifactIR(data) {
  const errors = [];

  if (!isObject(data)) {
    return { valid: false, errors: ['ArtifactIR root must be an object'] };
  }

  if (!STRATEGY_TYPES.has(data.strategy_type)) {
    pushError(errors, 'strategy_type', `must be one of: ${Array.from(STRATEGY_TYPES).join(', ')}`);
  }

  validateMeta(data.meta, errors);
  validateSourceInputs(data.source_inputs, errors);
  validateTargetProject(data.target_project, errors);
  validateOperatingModel(data.operating_model, errors);
  validateInstallation(data.installation, errors);
  validateRepoGrounding(data.repo_grounding, errors);
  validateGates(data.mandatory_gates, errors);
  validateScenarios(data.scenarios, errors);
  validateSkillMapping(data.skill_mapping, errors);
  validateChosenSkills(data.chosen_skills, errors);
  validateEvidenceModel(data.evidence_model, errors);
  validateImplementationPlan(data.implementation_plan, errors);
  validateImplementationTasks(data.implementation_tasks, errors);
  validateAntiGoals(data.anti_goals, errors);
  validateDecisions(data.decisions, errors);
  validateNextSteps(data.next_steps, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function readArtifactIR(filePath) {
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw);
}

function formatResult(result, filePath) {
  if (result.valid) {
    return `✓ ${filePath}`;
  }
  return [`✗ ${filePath}`, ...result.errors.map((error) => `  - ${error}`)].join('\n');
}

function main(argv) {
  const filePaths = argv.slice(2);
  if (filePaths.length === 0) {
    console.error('Usage: node plugins/beagle-strategy/scripts/validate-artifact-ir.mjs <artifact-ir.json> [more.json]');
    process.exit(1);
  }

  let hasErrors = false;

  for (const filePath of filePaths) {
    try {
      const document = readArtifactIR(filePath);
      const result = validateArtifactIR(document);
      console.log(formatResult(result, filePath));
      if (!result.valid) {
        hasErrors = true;
      }
    } catch (error) {
      hasErrors = true;
      console.error(`✗ ${filePath}`);
      console.error(`  - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
