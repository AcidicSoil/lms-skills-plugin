import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { readArtifactIR, validateArtifactIR } from './validate-artifact-ir.mjs';
import { buildRepoMap, renderRepoMapMarkdown } from './map-repo-surfaces.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.resolve(__dirname, '../templates');
const MANAGED_BLOCK_VERSION = '1.0';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'strategy';
}

function readTemplate(templateName) {
  return fs.readFileSync(path.join(templatesDir, templateName), 'utf8');
}

function replacePlaceholders(template, replacements) {
  let output = template;
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

function listItems(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderStatementCards(items, label) {
  return items.map((item) => `
    <article class="card">
      <div class="muted-kicker">${escapeHtml(item.id)} · ${escapeHtml(label)}</div>
      <h4>${escapeHtml(item.statement || item.action)}</h4>
      ${item.evidence ? `<p><strong>Evidence:</strong> ${escapeHtml(item.evidence)}</p>` : ''}
      ${item.owner ? `<p><strong>Owner:</strong> ${escapeHtml(item.owner)}</p>` : ''}
      ${item.mitigation ? `<p><strong>Mitigation:</strong> ${escapeHtml(item.mitigation)}</p>` : ''}
    </article>`).join('');
}

function normalizeArtifactIR(document) {
  const validation = validateArtifactIR(document);
  if (!validation.valid) {
    throw new Error(`ArtifactIR validation failed: ${validation.errors.join('; ')}`);
  }

  return {
    ...document,
    strategy_slug: slugify(document.meta.strategy_id || document.meta.title),
    normalized_at: document.meta.created_at,
  };
}

function enrichRepoGroundingFromRepoMap(normalized, repoMap) {
  const existing = normalized.repo_grounding.inspected_surfaces;
  const merged = [];
  const seen = new Set();

  for (const surface of existing) {
    if (seen.has(surface.path)) continue;
    seen.add(surface.path);
    merged.push(surface);
  }

  for (const surface of repoMap.priority_surfaces || []) {
    if (seen.has(surface.path)) continue;
    seen.add(surface.path);
    merged.push({
      path: surface.path,
      kind: surface.kind,
      finding: surface.finding,
    });
  }

  const bounded = merged.slice(0, 12);
  const addedCount = Math.max(0, bounded.length - existing.length);
  const summary = addedCount > 0 && repoMap.source === 'filesystem'
    ? `${normalized.repo_grounding.summary} Auto-enriched with ${addedCount} additional mapped surfaces from the repo-map preflight.`
    : normalized.repo_grounding.summary;

  return {
    ...normalized,
    repo_grounding: {
      ...normalized.repo_grounding,
      summary,
      inspected_surfaces: bounded,
    },
  };
}

function renderGateCards(gates) {
  return gates.map((gate) => `
    <article class="card">
      <div class="muted-kicker">${escapeHtml(gate.id)}</div>
      <h4>${escapeHtml(gate.title)}</h4>
      <p><strong>When:</strong> ${escapeHtml(gate.when)}</p>
      <p><strong>Focus:</strong> ${escapeHtml(gate.target_focus)}</p>
      <p><strong>Outcome:</strong> ${escapeHtml(gate.outcome)}</p>
      <p><strong>Skills:</strong></p>
      <ul>${listItems(gate.skills)}</ul>
    </article>`).join('');
}

function renderChosenSkills(skills) {
  return skills.map((skill) => `
    <article class="card">
      <div class="muted-kicker">Chosen skill</div>
      <h4>${escapeHtml(skill.skill_id)}</h4>
      <p><strong>Use when:</strong> ${escapeHtml(skill.use_when)}</p>
      <p><strong>Why chosen:</strong> ${escapeHtml(skill.why_chosen)}</p>
      <p><strong>Project surfaces:</strong> ${escapeHtml(skill.project_surfaces.join(', '))}</p>
      <p><strong>Audit expectations:</strong></p>
      <ul>${listItems(skill.audit_expectations)}</ul>
    </article>`).join('');
}

function renderImplementationPhases(phases) {
  return phases.map((phase, index) => `
    <article class="lane">
      <div class="lane-header">
        <div>
          <div class="muted-kicker">Phase ${index + 1}</div>
          <h4>${escapeHtml(phase.title)}</h4>
        </div>
        <div class="lane-label">${escapeHtml(phase.id)}</div>
      </div>
      <p><strong>Goal:</strong> ${escapeHtml(phase.goal)}</p>
      <p><strong>Required skills:</strong> ${escapeHtml(phase.required_skills.join(', '))}</p>
      <p><strong>Deliverables:</strong></p>
      <ul>${listItems(phase.deliverables)}</ul>
      <p><strong>Exit criteria:</strong></p>
      <ul>${listItems(phase.exit_criteria)}</ul>
    </article>`).join('');
}

function renderImplementationTasks(tasks) {
  return tasks.map((task) => `
    <article class="card" data-phase="${escapeHtml(task.phase_id)}">
      <div class="muted-kicker">${escapeHtml(task.id)} · ${escapeHtml(task.phase_id)}</div>
      <h4>${escapeHtml(task.title)}</h4>
      <p>${escapeHtml(task.summary)}</p>
      <p><strong>Required skills:</strong> ${escapeHtml(task.required_skills.join(', '))}</p>
      <p><strong>Status:</strong> ${escapeHtml(task.status || 'unspecified')}</p>
      <p><strong>Acceptance criteria:</strong></p>
      <ul>${listItems(task.acceptance_criteria)}</ul>
    </article>`).join('');
}

function renderPhaseFilterOptions(phases) {
  return phases.map((phase) => `<option value="${escapeHtml(phase.id)}">${escapeHtml(phase.title)}</option>`).join('');
}

function renderRepoGrounding(surfaces) {
  return surfaces.map((surface) => `
    <article class="card">
      <div class="muted-kicker">${escapeHtml(surface.kind)}</div>
      <h4>${escapeHtml(surface.path)}</h4>
      <p>${escapeHtml(surface.finding)}</p>
    </article>`).join('');
}

function renderWorkflowStats(normalized) {
  const stats = [
    {
      kicker: 'Scenario lanes',
      value: normalized.scenarios.length,
      description: 'Scenario-specific execution maps with artifacts, verification, and acceptance criteria.',
    },
    {
      kicker: 'Execution gates',
      value: normalized.mandatory_gates.length,
      description: 'Mandatory Beagle review checkpoints that govern work before, during, and after implementation.',
    },
    {
      kicker: 'Verification commands',
      value: normalized.evidence_model.default_verification_commands.length,
      description: 'Default repo proof commands available as the baseline execution checklist.',
    },
  ];

  return stats.map((stat) => `
    <article class="beagle-stat">
      <div class="beagle-kicker">${escapeHtml(stat.kicker)}</div>
      <strong>${escapeHtml(stat.value)}</strong>
      <p>${escapeHtml(stat.description)}</p>
    </article>`).join('');
}

function renderWorkflowScenarioLanes(scenarios) {
  return scenarios.map((scenario) => `
    <article class="lane beagle-lane beagle-surface">
      <div class="lane-header">
        <div>
          <div class="beagle-kicker">Scenario lane</div>
          <h2>${escapeHtml(scenario.title)}</h2>
        </div>
        <div class="lane-label">${escapeHtml(scenario.id)}</div>
      </div>
      <p><strong>When:</strong> ${escapeHtml(scenario.when)}</p>
      <p><strong>Target focus:</strong> ${escapeHtml(scenario.target_focus)}</p>
      <div class="beagle-inline-list">${scenario.repo_surfaces.map((surface) => `<span class="beagle-pill">${escapeHtml(surface)}</span>`).join('')}</div>
      <p><strong>Governing skills:</strong></p>
      <ul class="beagle-list">${listItems(scenario.governing_skills)}</ul>
      <p><strong>Required artifacts:</strong></p>
      <ul class="beagle-list">${listItems(scenario.required_artifacts)}</ul>
      <p><strong>Verification:</strong></p>
      <ul class="beagle-list">${listItems(scenario.verification)}</ul>
      <p><strong>Acceptance criteria:</strong></p>
      <ul class="beagle-list">${listItems(scenario.acceptance_criteria)}</ul>
      <p><strong>Execution order:</strong></p>
      <ol class="beagle-ordered-list">${scenario.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      <p><strong>Outcome:</strong> ${escapeHtml(scenario.outcome)}</p>
    </article>`).join('');
}

function renderScenarioGateCards(gates) {
  return gates.map((gate) => `
    <article class="gate beagle-card beagle-surface">
      <div class="gate-header">
        <div>
          <div class="beagle-kicker">Execution gate</div>
          <h3>${escapeHtml(gate.title)}</h3>
        </div>
        <div class="gate-label">${escapeHtml(gate.id)}</div>
      </div>
      <p><strong>When:</strong> ${escapeHtml(gate.when)}</p>
      <p><strong>Focus:</strong> ${escapeHtml(gate.target_focus)}</p>
      <p><strong>Outcome:</strong> ${escapeHtml(gate.outcome)}</p>
      <ul class="beagle-list">${listItems(gate.skills)}</ul>
    </article>`).join('');
}

function renderScenarioFlowCards(scenarios) {
  return scenarios.map((scenario) => `
    <article class="lane">
      <div class="lane-header">
        <div>
          <div class="muted-kicker">Scenario lane</div>
          <h4>${escapeHtml(scenario.title)}</h4>
        </div>
        <div class="lane-label">${escapeHtml(scenario.id)}</div>
      </div>
      <p><strong>When:</strong> ${escapeHtml(scenario.when)}</p>
      <p><strong>Target focus:</strong> ${escapeHtml(scenario.target_focus)}</p>
      <p><strong>Repo surfaces:</strong> ${escapeHtml(scenario.repo_surfaces.join(', '))}</p>
      <p><strong>Governing skills:</strong> ${escapeHtml(scenario.governing_skills.join(', '))}</p>
      <p><strong>Required artifacts:</strong> ${escapeHtml(scenario.required_artifacts.join(', '))}</p>
      <p><strong>Verification:</strong> ${escapeHtml(scenario.verification.join(' · '))}</p>
      <p><strong>Acceptance criteria:</strong></p>
      <ul>${listItems(scenario.acceptance_criteria)}</ul>
      <ol>${scenario.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      <p><strong>Outcome:</strong> ${escapeHtml(scenario.outcome)}</p>
    </article>`).join('');
}

function renderVerificationCommandItems(commands) {
  return escapeHtml(commands.join('\n'));
}

function inferSkillCompliance(normalized) {
  return normalized.chosen_skills.map((skill) => {
    const inPhases = normalized.implementation_plan.phases.some((phase) => phase.required_skills.includes(skill.skill_id));
    const inTasks = normalized.implementation_tasks.some((task) => task.required_skills.includes(skill.skill_id));
    const inScenarios = normalized.scenarios.some((scenario) => scenario.governing_skills.includes(skill.skill_id));

    let verdict = 'missing';
    let evidence = 'The chosen skill is not yet mapped into the current strategy contract.';
    let gap = 'Add the skill to phases, tasks, or scenario lanes before treating it as governed work.';

    if (inPhases && inTasks && inScenarios) {
      verdict = 'covered';
      evidence = 'The skill is named across phases, tasks, and scenario lanes, so the strategy contract covers where it should govern work.';
      gap = 'Execution evidence is still required before claiming real-world compliance.';
    } else if (inPhases || inTasks || inScenarios) {
      verdict = 'partial';
      evidence = 'The skill is referenced in part of the strategy contract, but coverage is incomplete across phases, tasks, and scenario lanes.';
      gap = 'Align the missing phase/task/scenario references before using this as an audit baseline.';
    }

    return {
      ...skill,
      verdict,
      evidence,
      gap,
    };
  });
}

function countSkillVerdicts(compliance) {
  return compliance.reduce((counts, item) => {
    counts[item.verdict] += 1;
    return counts;
  }, { covered: 0, partial: 0, missing: 0 });
}

function getTargetRepoRoot(normalized) {
  return normalized.target_project?.repo_path ? path.resolve(normalized.target_project.repo_path) : null;
}

function formatArtifactReference(repoRoot, filePath) {
  const normalizedPath = filePath.split(path.sep).join('/');
  if (!repoRoot) return normalizedPath;
  const relative = path.relative(repoRoot, filePath);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return (relative || path.basename(filePath)).split(path.sep).join('/');
  }
  return normalizedPath;
}

function buildArtifactReferenceContext(normalized, bundleDir, files) {
  const repoRoot = getTargetRepoRoot(normalized);
  const agentsFile = repoRoot ? path.join(repoRoot, 'AGENTS.md') : null;
  const bundleFiles = Object.fromEntries(Object.entries(files).map(([key, file]) => [
    key,
    formatArtifactReference(repoRoot, path.join(bundleDir, file)),
  ]));

  return {
    repo_root: repoRoot,
    agents_file: agentsFile,
    agents_file_reference: agentsFile ? formatArtifactReference(repoRoot, agentsFile) : null,
    bundle_files: bundleFiles,
  };
}

function writeManagedInstructionBlock(targetFile, blockContent, markerName) {
  ensureDir(path.dirname(targetFile));
  const beginMarker = `<!-- BEGIN ${markerName} -->`;
  const endMarker = `<!-- END ${markerName} -->`;
  const current = fs.existsSync(targetFile) ? fs.readFileSync(targetFile, 'utf8') : '';
  const blockPattern = new RegExp(`${beginMarker}[\s\S]*?${endMarker}\n?`, 'g');
  const stripped = current.replace(blockPattern, '').trimEnd();
  const prefix = stripped ? `${stripped}\n\n` : '';
  fs.writeFileSync(targetFile, `${prefix}${beginMarker}\n${blockContent.trim()}\n${endMarker}\n`, 'utf8');
}

function deriveHighestRisk(normalized, artifactContext) {
  const risks = normalized.evidence_model.residual_risks || [];
  if (artifactContext?.agents_file) {
    const filtered = risks.filter((item) => !/ceremony|cite skills without attaching concrete phase\/task evidence/i.test(item.statement));
    return filtered[0]?.statement || 'Artifact references can still drift if the bundle moves and the repo AGENTS.md reference block is not refreshed.';
  }
  return risks[0]?.statement || 'No residual risk captured.';
}

function deriveNextRequiredAction(normalized, artifactContext) {
  if (artifactContext?.agents_file_reference) {
    return `Run the repo-local AGENTS injection script so ${artifactContext.agents_file_reference} points agents at the generated strategy artifacts before implementation starts.`;
  }
  return normalized.evidence_model.recommended_follow_ups[0]?.action || 'No follow-up action captured.';
}

function renderAgentInstructionBlockMarkdown(normalized, artifactContext) {
  const files = artifactContext.bundle_files;
  const lines = [];
  lines.push(`Use Beagle Strategy in ${normalized.target_project.name} for non-trivial implementation, review, audit, migration, and handoff work that touches repo-governed surfaces.`);
  lines.push('');
  lines.push('## Read these generated artifacts first');
  lines.push('');
  lines.push(`- \`${files.implementation_plan_md}\` — identify the active phase, active task, required skills, acceptance criteria, and current follow-ups.`);
  lines.push(`- \`${files.agent_gates_md}\` — read the mandatory before/during/after execution rules and verification baseline.`);
  lines.push(`- \`${files.agents_reference_md}\` — use the compact artifact index when you need the full bundle map.`);
  lines.push(`- \`${files.strategy_html}\`, \`${files.scenario_workflows_html}\`, and \`${files.compliance_runbook_html}\` — reopen these when scenario framing, proof, or readiness questions arise.`);
  lines.push('');
  lines.push('## Artifact precedence and source of truth');
  lines.push('');
  lines.push(`1. \`${files.implementation_plan_md}\` and the current active task within it.`);
  lines.push('2. The repo-grounded strategy artifacts generated in this bundle.');
  lines.push('3. The thin target-specific wrapper text around this managed block.');
  lines.push('4. Legacy instruction text outside this managed block, only when it does not conflict with the generated bundle.');
  lines.push('');
  lines.push('## Mandatory behavior before implementation');
  lines.push('');
  lines.push('- Determine the active scenario, phase, and task before editing code, docs, tests, or config.');
  lines.push('- Re-read the generated artifacts instead of relying on memory or generic Beagle advice.');
  lines.push('- Identify the chosen Beagle skills that govern the touched repo surfaces and invoke them without waiting to be asked.');
  lines.push('- If required generated artifacts are missing, stale, or conflict with repo reality, regenerate or refresh the bundle before claiming readiness.');
  lines.push('');
  lines.push('## Mandatory behavior during execution');
  lines.push('');
  lines.push('- Treat the implementation plan and active task as the primary work unit.');
  lines.push('- Keep repo changes, docs updates, and execution notes aligned to the same active task and acceptance criteria.');
  lines.push('- Re-open scenario and compliance artifacts when the task crosses boundaries, introduces risk, or changes proof expectations.');
  lines.push('- Do not treat partial code changes or tool success as completion proof.');
  lines.push('');
  lines.push('## Artifact sync after changes');
  lines.push('');
  lines.push('- In the same run, update any affected strategy artifacts when task reality, proof expectations, repo surfaces, or next-step guidance changed.');
  lines.push(`- Refresh \`${files.agents_reference_md}\`, \`${files.agent_instruction_block_md}\`, and any injected instruction file when the bundle contract changes.`);
  lines.push('- Replace only the managed Beagle block on reinjection and preserve user-authored content outside the markers.');
  lines.push('');
  lines.push('## Proof and verification expectations');
  lines.push('');
  lines.push('- Capture the cheapest sufficient proof before claiming completion, using targeted tests, checks, or direct inspection appropriate to the change.');
  lines.push('- If a recommended verification step is skipped, state why it was skipped and what residual risk remains.');
  lines.push('- Attach proof to the execution notes or handoff so later agents can audit the result.');
  lines.push('');
  lines.push('## Task selection rule');
  lines.push('');
  lines.push('- Continue the current active task first.');
  lines.push('- Promote the next task only when the current one is complete, blocked with evidence, or superseded by refreshed strategy artifacts.');
  lines.push('');
  lines.push('## Closeout and handoff rule');
  lines.push('');
  lines.push('- Before handing off, update the generated artifacts, verify proof is attached, and make sure the next agent can identify the real active task without reconstructing context from chat history.');
  lines.push('');
  lines.push('## Anti-drift rules');
  lines.push('');
  lines.push('- Do not invent repo guidance that contradicts the generated bundle.');
  lines.push('- Do not cite Beagle skills ceremonially; tie them to touched surfaces, active tasks, and proof obligations.');
  lines.push('- Do not leave strategy artifacts stale after materially changing the execution reality they describe.');
  return lines.join('\n');
}

function renderAgentInstructionTargetsJSON(normalized, artifactContext) {
  const defaultAgentsFile = artifactContext.agents_file_reference || 'AGENTS.md';
  return JSON.stringify({
    schema_version: MANAGED_BLOCK_VERSION,
    managed_block: {
      namespace: 'beagle-strategy:managed-block',
      version: MANAGED_BLOCK_VERSION,
      end_marker: '<!-- END beagle-strategy:managed-block -->'
    },
    targets: {
      agents: {
        label: 'AGENTS.md',
        default_target_file: defaultAgentsFile,
        prelude: [
          'Read the managed Beagle Strategy block below before non-trivial repo work. Use the generated bundle as the execution contract.'
        ],
        appendix: []
      },
      claude: {
        label: 'CLAUDE.md',
        default_target_file: 'CLAUDE.md',
        prelude: [
          'Use the artifact-first execution loop in the managed Beagle Strategy block below before planning or implementation.'
        ],
        appendix: [
          'Preferred command flow: read the generated artifacts, identify the active task, execute with mapped skills, then refresh affected artifacts before handoff.'
        ]
      },
      codex: {
        label: '.codex/AGENTS.md',
        default_target_file: '.codex/AGENTS.md',
        prelude: [
          'For Codex, the managed Beagle Strategy block below is mandatory repo intake. Read the generated artifacts and required skills before acting.'
        ],
        appendix: [
          'Required Beagle skills are part of the execution contract when their governed surfaces change.'
        ]
      },
      hermes: {
        label: 'HERMES.md',
        default_target_file: 'HERMES.md',
        prelude: [
          'For Hermes, use the managed Beagle Strategy block below to drive repo intake, gates, workflows, and compliance surfaces.'
        ],
        appendix: [
          'Escalate missing proof, stale artifacts, or scenario drift before claiming the repo is execution-ready.'
        ]
      },
      pi: {
        label: '.pi/AGENTS.md',
        default_target_file: '.pi/AGENTS.md',
        prelude: [
          'For Pi, read the managed Beagle Strategy block below first and treat the generated artifacts as the repo execution contract.'
        ],
        appendix: [
          'Keep repo changes and Beagle artifacts synchronized in the same run whenever execution reality changes.'
        ]
      }
    }
  }, null, 2);
}

function renderAgentsReferenceMarkdown(normalized, artifactContext) {
  const files = artifactContext.bundle_files;
  const lines = [];
  lines.push('# Beagle Strategy Artifact References');
  lines.push('');
  lines.push(`This file is the compact artifact index for ${normalized.target_project.name}. The primary drop-in instruction artifact is \`${files.agent_instruction_block_md}\`.`);
  lines.push('');
  lines.push('## Primary drop-in deliverables');
  lines.push('');
  lines.push(`- \`${files.agent_instruction_block_md}\` — canonical shared execution contract for agent instruction files.`);
  lines.push(`- \`${files.agent_instruction_targets_json}\` — target-aware wrapper rules for AGENTS.md, CLAUDE.md, .codex/AGENTS.md, HERMES.md, and .pi/AGENTS.md.`);
  lines.push(`- \`${files.agents_reference_md}\` — this compact artifact index and pointer sheet.`);
  lines.push('');
  lines.push('## Generated artifact index');
  lines.push('');
  lines.push(`- \`${files.strategy_html}\` — primary strategy artifact with repo grounding, chosen skills, phases, and tasks.`);
  lines.push(`- \`${files.agent_gates_md}\` — direct execution checklist, required gates, and default verification commands.`);
  lines.push(`- \`${files.implementation_plan_md}\` — current phase/task map, required skills, follow-ups, and residual risks.`);
  lines.push(`- \`${files.scenario_workflows_html}\` — scenario-specific execution flows, acceptance criteria, and governing skills.`);
  lines.push(`- \`${files.skill_mapping_json}\` — machine-readable map of repo surfaces, chosen skills, and audit expectations.`);
  lines.push(`- \`${files.compliance_runbook_html}\` — execution-readiness dashboard and proof queue.`);
  lines.push(`- \`${files.repo_map_md}\` and \`${files.repo_map_json}\` — repo grounding inputs for later refreshes and drift checks.`);
  lines.push(`- \`${files.strategy_manifest_json}\` — manifest and file index for the bundle.`);
  lines.push('');
  lines.push('## Injection targets');
  lines.push('');
  lines.push(artifactContext.agents_file_reference ? `- Default repo target: \`${artifactContext.agents_file_reference}\`` : '- No repo-local AGENTS.md target was available during rendering.');
  lines.push('- Additional supported targets: `CLAUDE.md`, `.codex/AGENTS.md`, `HERMES.md`, `.pi/AGENTS.md`.');
  lines.push('- Use the repo-local injector to replace only the managed Beagle block and preserve all user-authored text outside the markers.');
  return lines.join('\n');
}

function renderComplianceSummaryStats(normalized, compliance, artifactContext) {
  const verdictCounts = countSkillVerdicts(compliance);
  const highestRisk = deriveHighestRisk(normalized, artifactContext);
  const nextAction = deriveNextRequiredAction(normalized, artifactContext);
  const allTasksPlanned = normalized.implementation_tasks.every((task) => {
    const status = (task.status || 'unspecified').toLowerCase();
    return status === 'planned' || status === 'pending' || status === 'unspecified';
  });
  const posture = verdictCounts.missing > 0
    ? 'Contract gaps remain'
    : verdictCounts.partial > 0
      ? 'Contract coverage is partial'
      : allTasksPlanned
        ? 'Contract defined, execution pending'
        : 'Contract coverage aligned';
  const stats = [
    {
      kicker: 'Runbook posture',
      value: posture,
      description: 'This runbook reports strategy-contract coverage and execution readiness, not live task completion proof.',
    },
    {
      kicker: 'Highest-risk gap',
      value: highestRisk,
      description: 'Current open risk after generating direct AGENTS references and instruction-first artifacts.',
    },
    {
      kicker: 'Next required action',
      value: nextAction,
      description: 'Default next move to get repo agents following the bundle through AGENTS.md.',
    },
    {
      kicker: 'Chosen skill coverage',
      value: `${verdictCounts.covered || 0} covered · ${verdictCounts.partial || 0} partial · ${verdictCounts.missing || 0} missing`,
      description: 'Skill-level counts based on where the current strategy contract names each chosen skill.',
    },
  ];

  return stats.map((stat) => `
    <article class="beagle-stat">
      <div class="beagle-kicker">${escapeHtml(stat.kicker)}</div>
      <strong>${escapeHtml(stat.value)}</strong>
      <p>${escapeHtml(stat.description)}</p>
    </article>`).join('');
}

function renderComplianceRows(compliance) {
  return compliance.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.skill_id)}</strong></td>
      <td>${escapeHtml(item.use_when)}</td>
      <td>${escapeHtml(item.project_surfaces.join(', '))}</td>
      <td><span class="status-badge status-badge--${escapeHtml(item.verdict)}">${escapeHtml(item.verdict)}</span></td>
      <td>${escapeHtml(item.evidence)}</td>
      <td>${escapeHtml(item.gap)}</td>
    </tr>`).join('');
}

function derivePhaseStatus(phase, tasks) {
  const statuses = tasks.map((task) => (task.status || 'unspecified').toLowerCase());
  if (statuses.length === 0) return 'unspecified';
  if (statuses.every((status) => status === 'done' || status === 'complete' || status === 'completed')) return 'complete';
  if (statuses.some((status) => status === 'in-progress' || status === 'in_progress' || status === 'active')) return 'in progress';
  if (statuses.some((status) => status === 'blocked')) return 'blocked';
  if (statuses.every((status) => status === 'planned' || status === 'pending' || status === 'unspecified')) return 'planned';
  return 'mixed';
}

function renderPhaseTaskBoard(normalized) {
  return normalized.implementation_plan.phases.map((phase) => {
    const tasks = normalized.implementation_tasks.filter((task) => task.phase_id === phase.id);
    const phaseStatus = derivePhaseStatus(phase, tasks);
    const taskMarkup = tasks.map((task) => `
      <li>
        <strong>${escapeHtml(task.id)}</strong> — ${escapeHtml(task.title)} · status: ${escapeHtml(task.status || 'unspecified')} · required skills: ${escapeHtml(task.required_skills.join(', '))}
      </li>`).join('');

    return `
      <article class="phase-lane">
        <div class="phase-head">
          <div>
            <div class="beagle-kicker">Phase lane</div>
            <h3>${escapeHtml(phase.title)}</h3>
          </div>
          <div class="phase-label">${escapeHtml(phase.id)} · ${escapeHtml(phaseStatus)}</div>
        </div>
        <p><strong>Goal:</strong> ${escapeHtml(phase.goal)}</p>
        <p><strong>Deliverables:</strong> ${escapeHtml(phase.deliverables.join(', '))}</p>
        <p><strong>Exit criteria:</strong> ${escapeHtml(phase.exit_criteria.join(' · '))}</p>
        <ul>${taskMarkup}</ul>
      </article>`;
  }).join('');
}

function renderScenarioAuditLanes(normalized, compliance) {
  const hasMissingSkills = compliance.some((item) => item.verdict === 'missing');
  const hasPartialSkills = compliance.some((item) => item.verdict === 'partial');
  const scenarioVerdict = hasMissingSkills ? 'missing' : hasPartialSkills ? 'partial' : 'covered';

  return normalized.scenarios.map((scenario) => `
    <article class="scenario-card">
      <div class="scenario-head">
        <div>
          <div class="beagle-kicker">Scenario audit lane</div>
          <h3>${escapeHtml(scenario.title)}</h3>
        </div>
        <div class="scenario-label"><span class="status-badge status-badge--${escapeHtml(scenarioVerdict)}">${escapeHtml(scenarioVerdict)}</span></div>
      </div>
      <p><strong>When:</strong> ${escapeHtml(scenario.when)}</p>
      <p><strong>Target focus:</strong> ${escapeHtml(scenario.target_focus)}</p>
      <div class="pill-row">${scenario.repo_surfaces.map((surface) => `<span class="pill">${escapeHtml(surface)}</span>`).join('')}</div>
      <p><strong>Governing skills:</strong></p>
      <ul>${listItems(scenario.governing_skills)}</ul>
      <p><strong>Required artifacts:</strong></p>
      <ul>${listItems(scenario.required_artifacts)}</ul>
      <p><strong>Verification:</strong></p>
      <ul>${listItems(scenario.verification)}</ul>
      <p><strong>Acceptance criteria:</strong></p>
      <ul>${listItems(scenario.acceptance_criteria)}</ul>
      <p><strong>Outcome:</strong> ${escapeHtml(scenario.outcome)}</p>
    </article>`).join('');
}

function renderActionQueue(normalized, compliance, artifactContext) {
  const coverageGaps = compliance.filter((item) => item.verdict !== 'covered').map((item) => `Close the chosen-skill coverage gap for ${item.skill_id}.`);
  const followUps = normalized.evidence_model.recommended_follow_ups.map((item) => item.action);
  const pendingExecution = normalized.implementation_tasks.some((task) => {
    const status = (task.status || 'unspecified').toLowerCase();
    return status === 'planned' || status === 'pending' || status === 'unspecified';
  })
    ? ['Execution is still pending on planned tasks, so do not treat this runbook as completion proof yet.']
    : [];
  const agentsFlow = artifactContext?.agents_file_reference
    ? [`Update ${artifactContext.agents_file_reference} through the repo-local injection script whenever these artifact paths or chosen skills change.`]
    : [];
  const commands = normalized.evidence_model.default_verification_commands.slice(0, 2).map((command) => `Run ${command} and attach the proof to the current execution notes.`);
  return [...coverageGaps, ...pendingExecution, ...agentsFlow, ...followUps, ...commands].slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderComplianceRunbookHTML(normalized, artifactContext) {
  const template = readTemplate('beagle-compliance-runbook.html');
  const compliance = inferSkillCompliance(normalized);
  return replacePlaceholders(template, {
    BEAGLE_SHARED_HEAD: readTemplate('partials/beagle-shell-head.html'),
    TITLE: escapeHtml(`${normalized.meta.title} — Compliance Runbook`),
    SUBTITLE: escapeHtml(`Audit and enforcement dashboard for showing how fully the ${normalized.target_project.name} strategy contract is defined, what still needs proof, and where execution evidence must be attached.`),
    HEADER_CHIPS: [
      `<span class="beagle-chip">Compliance Runbook</span>`,
      `<span class="beagle-chip">Target: ${escapeHtml(normalized.target_project.name)}</span>`,
      `<span class="beagle-chip">Strategy: ${escapeHtml(normalized.meta.strategy_id)}</span>`,
    ].join(''),
    SUMMARY_STATS: renderComplianceSummaryStats(normalized, compliance, artifactContext),
    COMPLIANCE_ROWS: renderComplianceRows(compliance),
    PHASE_TASK_BOARD: renderPhaseTaskBoard(normalized),
    VERIFIED_FACTS_HTML: renderStatementCards(normalized.evidence_model.verified_facts, 'Verified fact'),
    INFERRED_CONCLUSIONS_HTML: renderStatementCards(normalized.evidence_model.inferred_conclusions, 'Inference'),
    RESIDUAL_RISKS_HTML: renderStatementCards(normalized.evidence_model.residual_risks, 'Residual risk'),
    SCENARIO_AUDIT_LANES: renderScenarioAuditLanes(normalized, compliance),
    ACTION_QUEUE: renderActionQueue(normalized, compliance, artifactContext),
  });
}

function renderStrategyArtifactHTML(normalized) {
  const template = readTemplate('beagle-integration-strategy.html');
  return replacePlaceholders(template, {
    BEAGLE_SHARED_HEAD: readTemplate('partials/beagle-shell-head.html'),
    TITLE: escapeHtml(normalized.meta.title),
    SUBTITLE: escapeHtml(normalized.meta.subtitle),
    TARGET_PROJECT_NAME: escapeHtml(normalized.target_project.name),
    BOUNDARY_MODE: escapeHtml(normalized.installation?.boundary_mode || 'agent-only'),
    STRATEGY_ID: escapeHtml(normalized.meta.strategy_id),
    OPERATING_MODEL_SUMMARY: escapeHtml(normalized.operating_model.summary),
    OPERATING_MODEL_PRINCIPLES: listItems(normalized.operating_model.principles),
    INSTALLATION_SUMMARY: escapeHtml(normalized.installation.summary),
    INSTALLATION_STEPS: listItems(normalized.installation.steps),
    REPO_GROUNDING_SUMMARY: escapeHtml(normalized.repo_grounding.summary),
    REPO_GROUNDING_HTML: renderRepoGrounding(normalized.repo_grounding.inspected_surfaces),
    GATES_HTML: renderGateCards(normalized.mandatory_gates),
    CHOSEN_SKILLS_HTML: renderChosenSkills(normalized.chosen_skills),
    CHOSEN_SKILL_COUNT: escapeHtml(normalized.chosen_skills.length),
    IMPLEMENTATION_PLAN_SUMMARY: escapeHtml(normalized.implementation_plan.summary),
    IMPLEMENTATION_PHASE_COUNT: escapeHtml(normalized.implementation_plan.phases.length),
    IMPLEMENTATION_TASK_COUNT: escapeHtml(normalized.implementation_tasks.length),
    SCENARIO_COUNT: escapeHtml(normalized.scenarios.length),
    REPO_SURFACE_COUNT: escapeHtml(normalized.repo_grounding.inspected_surfaces.length),
    VERIFIED_FACT_COUNT: escapeHtml(normalized.evidence_model.verified_facts.length),
    RESIDUAL_RISK_COUNT: escapeHtml(normalized.evidence_model.residual_risks.length),
    IMPLEMENTATION_PHASES_HTML: renderImplementationPhases(normalized.implementation_plan.phases),
    PHASE_FILTER_OPTIONS: renderPhaseFilterOptions(normalized.implementation_plan.phases),
    IMPLEMENTATION_TASKS_HTML: renderImplementationTasks(normalized.implementation_tasks),
    SCENARIO_FLOW_HTML: renderScenarioFlowCards(normalized.scenarios),
    VERIFIED_FACTS_HTML: renderStatementCards(normalized.evidence_model.verified_facts, 'Verified fact'),
    INFERRED_CONCLUSIONS_HTML: renderStatementCards(normalized.evidence_model.inferred_conclusions, 'Inference'),
    FOLLOW_UPS_HTML: renderStatementCards(normalized.evidence_model.recommended_follow_ups, 'Follow-up'),
    RESIDUAL_RISKS_HTML: renderStatementCards(normalized.evidence_model.residual_risks, 'Residual risk'),
    DEFAULT_VERIFICATION_COMMANDS: escapeHtml(normalized.evidence_model.default_verification_commands.join('\n')),
    ANTI_GOALS: listItems(normalized.anti_goals.map((item) => item.statement)),
    DECISIONS: listItems(normalized.decisions.map((item) => `${item.statement} — ${item.rationale}`)),
    NEXT_STEPS: listItems(normalized.next_steps.map((item) => `${item.title} — owner: ${item.owner}${item.status ? ` — status: ${item.status}` : ''}`)),
  });
}

function renderScenarioWorkflowsHTML(normalized) {
  const template = readTemplate('scenario-workflows.html');
  return replacePlaceholders(template, {
    BEAGLE_SHARED_HEAD: readTemplate('partials/beagle-shell-head.html'),
    TITLE: escapeHtml(`${normalized.meta.title} — Scenario Workflows`),
    SUBTITLE: escapeHtml(`Scenario-based workflows for applying Beagle across ${normalized.target_project.name} engineering work.`),
    HEADER_CHIPS: [
      `<span class="beagle-chip">Workflow Map</span>`,
      `<span class="beagle-chip">Target: ${escapeHtml(normalized.target_project.name)}</span>`,
    ].join(''),
    WORKFLOW_STATS: renderWorkflowStats(normalized),
    SCENARIO_LANES: renderWorkflowScenarioLanes(normalized.scenarios),
    SCENARIO_GATES: renderScenarioGateCards(normalized.mandatory_gates),
    VERIFICATION_COMMANDS: renderVerificationCommandItems(normalized.evidence_model.default_verification_commands),
  });
}

function renderAgentGatesMarkdown(normalized) {
  const lines = [];
  lines.push(`# ${normalized.meta.title} — Agent Gates`);
  lines.push('');
  lines.push(normalized.meta.subtitle);
  lines.push('');
  lines.push(`Target project: ${normalized.target_project.name}`);
  lines.push('');
  lines.push('## Do this before work starts');
  lines.push('');
  lines.push('- Identify the active scenario, phase, and task before editing code or docs.');
  lines.push('- Re-open the referenced strategy artifacts whenever repo surfaces or boundaries changed.');
  lines.push('- Capture review proof before declaring completion on risky runtime or orchestration changes.');
  lines.push('');

  for (const gate of normalized.mandatory_gates) {
    lines.push(`## ${gate.title}`);
    lines.push('');
    lines.push(`- When: ${gate.when}`);
    lines.push(`- Focus: ${gate.target_focus}`);
    lines.push(`- Outcome: ${gate.outcome}`);
    lines.push('- Skills:');
    for (const skill of gate.skills) {
      lines.push(`  - ${skill}`);
    }
    lines.push('');
  }

  lines.push('## Every execution note must include');
  lines.push('');
  lines.push('- Current phase and task');
  lines.push('- Required Beagle skills for the work');
  lines.push('- Required artifacts and acceptance criteria');
  lines.push('- Verification commands and proof notes');
  lines.push('');

  lines.push('## Run these default verification commands when relevant');
  lines.push('');
  for (const command of normalized.evidence_model.default_verification_commands) {
    lines.push(`- ${command}`);
  }
  lines.push('');


  return lines.join('\n');
}

function renderImplementationPlanMarkdown(normalized) {
  const lines = [];
  lines.push(`# ${normalized.meta.title} — Implementation Plan`);
  lines.push('');
  lines.push(normalized.implementation_plan.summary);
  lines.push('');
  lines.push('## Verified facts');
  lines.push('');
  for (const fact of normalized.evidence_model.verified_facts) {
    lines.push(`- ${fact.statement} Evidence: ${fact.evidence}`);
  }
  lines.push('');
  lines.push('## Inferred conclusions');
  lines.push('');
  for (const item of normalized.evidence_model.inferred_conclusions) {
    lines.push(`- ${item.statement} Basis: ${item.evidence}`);
  }
  lines.push('');
  lines.push('## Chosen Beagle skills');
  lines.push('');

  for (const skill of normalized.chosen_skills) {
    lines.push(`### ${skill.skill_id}`);
    lines.push('');
    lines.push(`- Use when: ${skill.use_when}`);
    lines.push(`- Project surfaces: ${skill.project_surfaces.join(', ')}`);
    lines.push(`- Why chosen: ${skill.why_chosen}`);
    lines.push('- Audit expectations:');
    for (const item of skill.audit_expectations) {
      lines.push(`  - ${item}`);
    }
    lines.push('');
  }

  lines.push('## Phases');
  lines.push('');
  for (const phase of normalized.implementation_plan.phases) {
    lines.push(`### ${phase.title}`);
    lines.push('');
    lines.push(`- Goal: ${phase.goal}`);
    lines.push(`- Required skills: ${phase.required_skills.join(', ')}`);
    lines.push('- Deliverables:');
    for (const deliverable of phase.deliverables) {
      lines.push(`  - ${deliverable}`);
    }
    lines.push('- Exit criteria:');
    for (const criterion of phase.exit_criteria) {
      lines.push(`  - ${criterion}`);
    }
    lines.push('');
  }

  lines.push('## Task list');
  lines.push('');
  for (const task of normalized.implementation_tasks) {
    lines.push(`### ${task.title}`);
    lines.push('');
    lines.push(`- Phase: ${task.phase_id}`);
    lines.push(`- Summary: ${task.summary}`);
    lines.push(`- Required skills: ${task.required_skills.join(', ')}`);
    lines.push(`- Status: ${task.status || 'unspecified'}`);
    lines.push('- Acceptance criteria:');
    for (const item of task.acceptance_criteria) {
      lines.push(`  - ${item}`);
    }
    lines.push('');
  }

  lines.push('## Recommended follow-ups');
  lines.push('');
  for (const item of normalized.evidence_model.recommended_follow_ups) {
    lines.push(`- ${item.action}${item.owner ? ` Owner: ${item.owner}` : ''}`);
  }
  lines.push('');
  lines.push('## Residual risks');
  lines.push('');
  for (const item of normalized.evidence_model.residual_risks) {
    lines.push(`- ${item.statement}${item.mitigation ? ` Mitigation: ${item.mitigation}` : ''}`);
  }
  lines.push('');

  return lines.join('\n');
}

function renderSkillMappingJSON(normalized, artifactContext) {
  return JSON.stringify({
    strategy_id: normalized.meta.strategy_id,
    target_project: normalized.target_project.name,
    repo_grounding: normalized.repo_grounding,
    repo_map: artifactContext.repo_map,
    default_verification_commands: normalized.evidence_model.default_verification_commands,
    skill_mapping: normalized.skill_mapping,
    chosen_skills: normalized.chosen_skills,
    scenarios: normalized.scenarios.map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      repo_surfaces: scenario.repo_surfaces,
      governing_skills: scenario.governing_skills,
      required_artifacts: scenario.required_artifacts,
      verification: scenario.verification,
      acceptance_criteria: scenario.acceptance_criteria,
    })),
  }, null, 2);
}

function renderStrategyManifest(normalized, files, artifactContext) {
  return JSON.stringify({
    strategy_id: normalized.meta.strategy_id,
    strategy_slug: normalized.strategy_slug,
    strategy_type: normalized.strategy_type,
    title: normalized.meta.title,
    subtitle: normalized.meta.subtitle,
    source_project: normalized.meta.source_project,
    target_project: normalized.target_project.name,
    normalized_at: normalized.normalized_at,
    counts: {
      source_inputs: normalized.source_inputs.length,
      repo_grounding_surfaces: normalized.repo_grounding.inspected_surfaces.length,
      mandatory_gates: normalized.mandatory_gates.length,
      scenarios: normalized.scenarios.length,
      skill_mapping: normalized.skill_mapping.length,
      chosen_skills: normalized.chosen_skills.length,
      verified_facts: normalized.evidence_model.verified_facts.length,
      inferred_conclusions: normalized.evidence_model.inferred_conclusions.length,
      recommended_follow_ups: normalized.evidence_model.recommended_follow_ups.length,
      residual_risks: normalized.evidence_model.residual_risks.length,
      implementation_phases: normalized.implementation_plan.phases.length,
      implementation_tasks: normalized.implementation_tasks.length,
      anti_goals: normalized.anti_goals.length,
      decisions: normalized.decisions.length,
      next_steps: normalized.next_steps.length
    },
    files,
    agent_instructions: artifactContext ? {
      target_agents_file: artifactContext.agents_file_reference,
      canonical_block_file: artifactContext.bundle_files.agent_instruction_block_md,
      target_rules_file: artifactContext.bundle_files.agent_instruction_targets_json,
      generated_reference_file: artifactContext.bundle_files.agents_reference_md
    } : null
  }, null, 2);
}

export function renderArtifactBundle(document, outputDir) {
  let normalized = normalizeArtifactIR(document);
  const bundleDir = path.resolve(outputDir, normalized.strategy_slug);
  ensureDir(bundleDir);

  const files = {
    strategy_html: 'beagle-integration-strategy.html',
    compliance_runbook_html: 'beagle-compliance-runbook.html',
    agent_gates_md: 'agent-gates.md',
    scenario_workflows_html: 'scenario-workflows.html',
    skill_mapping_json: 'skill-mapping.json',
    implementation_plan_md: 'implementation-plan.md',
    repo_map_md: 'repo-map.md',
    repo_map_json: 'repo-map.json',
    agent_instruction_block_md: 'agent-instruction-block.md',
    agent_instruction_targets_json: 'agent-instruction-targets.json',
    agents_reference_md: 'agents-reference.md',
    strategy_manifest_json: 'strategy-manifest.json'
  };

  const repoMap = buildRepoMap(normalized);
  normalized = enrichRepoGroundingFromRepoMap(normalized, repoMap);
  const artifactContext = buildArtifactReferenceContext(normalized, bundleDir, files);
  artifactContext.repo_map = repoMap;

  fs.writeFileSync(path.join(bundleDir, files.strategy_html), renderStrategyArtifactHTML(normalized), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.compliance_runbook_html), renderComplianceRunbookHTML(normalized, artifactContext), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.agent_gates_md), renderAgentGatesMarkdown(normalized), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.scenario_workflows_html), renderScenarioWorkflowsHTML(normalized), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.skill_mapping_json), renderSkillMappingJSON(normalized, artifactContext), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.implementation_plan_md), renderImplementationPlanMarkdown(normalized), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.repo_map_md), `${renderRepoMapMarkdown(repoMap)}\n`, 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.repo_map_json), `${JSON.stringify(repoMap, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.agent_instruction_block_md), renderAgentInstructionBlockMarkdown(normalized, artifactContext), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.agent_instruction_targets_json), `${renderAgentInstructionTargetsJSON(normalized, artifactContext)}\n`, 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.agents_reference_md), renderAgentsReferenceMarkdown(normalized, artifactContext), 'utf8');
  fs.writeFileSync(path.join(bundleDir, files.strategy_manifest_json), renderStrategyManifest(normalized, files, artifactContext), 'utf8');

  return {
    bundle_dir: bundleDir,
    normalized,
    files,
    artifact_context: artifactContext
  };
}

function parseArgs(argv) {
  const [inputPath, outputDir = 'plugins/beagle-strategy/output'] = argv.slice(2);
  if (!inputPath) {
    throw new Error('Usage: node plugins/beagle-strategy/scripts/render-artifact-bundle.mjs <artifact-ir.json> [output-dir]');
  }
  return { inputPath, outputDir };
}

function main(argv) {
  try {
    const { inputPath, outputDir } = parseArgs(argv);
    const document = readArtifactIR(inputPath);
    const result = renderArtifactBundle(document, outputDir);
    console.log(`Rendered strategy bundle to ${result.bundle_dir}`);
    Object.entries(result.files).forEach(([key, file]) => {
      console.log(`- ${key}: ${file}`);
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv);
}
