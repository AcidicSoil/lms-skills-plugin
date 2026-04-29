import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'beagle-strategy';
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    outputDir: 'plugins/beagle-strategy/output/scaffolds',
    targetProject: 'TargetProject',
    repoPath: 'path/to/repo',
    primaryLanguage: 'Unknown',
    sourceProject: 'beagle-strategy',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--output-dir') {
      options.outputDir = args[++index];
    } else if (arg === '--target-project') {
      options.targetProject = args[++index];
    } else if (arg === '--repo-path') {
      options.repoPath = args[++index];
    } else if (arg === '--primary-language') {
      options.primaryLanguage = args[++index];
    } else if (arg === '--source-project') {
      options.sourceProject = args[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function buildArtifactIRTemplate(options) {
  const strategyId = `${slugify(options.targetProject)}-beagle-strategy`;
  const now = new Date().toISOString();

  return {
    strategy_type: 'beagle_integration_strategy',
    meta: {
      title: `${options.targetProject} Beagle Integration Strategy`,
      subtitle: 'TODO: summarize how Beagle should guide agent planning, review, audit, and enforcement around this repo.',
      created_at: now,
      source_project: options.sourceProject,
      strategy_id: strategyId,
    },
    source_inputs: [
      {
        id: 'src-repo-survey',
        kind: 'repo-survey',
        label: `${options.targetProject} repo survey`,
        summary: 'TODO: summarize the local repo surfaces, docs, plans, or workflow notes inspected before generating the strategy.',
        path: options.repoPath,
      },
    ],
    target_project: {
      name: options.targetProject,
      summary: 'TODO: describe the target project and why it benefits from an external Beagle workflow.',
      primary_language: options.primaryLanguage,
      repo_path: options.repoPath,
    },
    operating_model: {
      summary: 'TODO: summarize the recommended Beagle operating model for this repo.',
      principles: [
        'TODO: planning gate before editing code.',
        'TODO: repo-specific review gates for risky surfaces.',
        'TODO: close the loop with audit, docs, and postmortem discipline.',
      ],
    },
    installation: {
      summary: 'TODO: describe how the skill should be installed for agents only.',
      scope: 'agents_only',
      steps: [
        'TODO: install or copy Beagle-strategy into the relevant local agent skill path.',
        'TODO: keep installation in developer or CI environments only.',
      ],
    },
    repo_grounding: {
      summary: 'TODO: summarize the repo surfaces that grounded this strategy.',
      inspected_surfaces: [
        {
          path: `${options.repoPath}/TODO-surface-1`,
          kind: 'runtime-entry',
          finding: 'TODO: describe why this surface matters to the strategy.',
        },
      ],
    },
    mandatory_gates: [
      {
        id: 'gate-0',
        title: 'TODO: planning gate',
        when: 'TODO: describe when this gate triggers.',
        skills: ['beagle-core:review-plan'],
        target_focus: 'TODO: name the repo surfaces this gate covers.',
        outcome: 'TODO: describe the expected output or decision from the gate.',
      },
    ],
    scenarios: [
      {
        id: 'scenario-0',
        title: 'TODO: primary repo workflow',
        when: 'TODO: describe when this scenario applies.',
        steps: [
          'TODO: step 1',
          'TODO: step 2',
        ],
        target_focus: 'TODO: summarize the key repo focus of this scenario.',
        repo_surfaces: [`${options.repoPath}/TODO-surface-1`],
        governing_skills: ['beagle-core:review-plan'],
        required_artifacts: ['TODO: required artifact or decision'],
        verification: ['TODO: verification command or proof step'],
        acceptance_criteria: ['TODO: acceptance criterion'],
        outcome: 'TODO: expected scenario result.',
      },
    ],
    skill_mapping: [
      {
        skill_group: 'beagle-core',
        use_for: 'TODO: explain why this Beagle skill group matters for the repo.',
        project_surfaces: ['TODO: relevant repo surface'],
        why: 'TODO: explain the real workflow gap this skill group closes.',
        avoid_when: 'TODO: describe when this skill group should not be used.',
      },
    ],
    chosen_skills: [
      {
        skill_id: 'beagle-core:review-plan',
        use_when: 'TODO: explain when the skill must be used.',
        project_surfaces: ['TODO: governed surface'],
        why_chosen: 'TODO: explain why this exact skill was chosen.',
        audit_expectations: ['TODO: audit expectation'],
      },
    ],
    evidence_model: {
      default_verification_commands: ['TODO: verification command'],
      verified_facts: [
        {
          id: 'fact-0',
          statement: 'TODO: verified fact grounded in repo inspection.',
          evidence: 'TODO: concrete evidence for the fact.',
        },
      ],
      inferred_conclusions: [
        {
          id: 'inference-0',
          statement: 'TODO: inferred conclusion based on the verified facts.',
          evidence: 'TODO: why the inference follows from the evidence.',
        },
      ],
      recommended_follow_ups: [
        {
          id: 'follow-up-0',
          action: 'TODO: follow-up action needed after the strategy is filled.',
          owner: 'TODO: owner',
        },
      ],
      residual_risks: [
        {
          id: 'risk-0',
          statement: 'TODO: residual risk that remains after planning.',
          mitigation: 'TODO: mitigation or containment plan.',
        },
      ],
    },
    implementation_plan: {
      summary: 'TODO: summarize the phased Beagle execution plan for the repo.',
      phases: [
        {
          id: 'phase-0',
          title: 'TODO: phase title',
          goal: 'TODO: phase goal',
          deliverables: ['TODO: deliverable'],
          required_skills: ['beagle-core:review-plan'],
          exit_criteria: ['TODO: phase exit criterion'],
        },
      ],
    },
    implementation_tasks: [
      {
        id: 'task-0',
        phase_id: 'phase-0',
        title: 'TODO: task title',
        summary: 'TODO: task summary',
        required_skills: ['beagle-core:review-plan'],
        acceptance_criteria: ['TODO: acceptance criterion'],
        status: 'planned',
      },
    ],
    anti_goals: [
      {
        id: 'anti-0',
        statement: 'TODO: what the strategy must not do.',
      },
    ],
    decisions: [
      {
        id: 'decision-0',
        statement: 'TODO: key strategy decision.',
        rationale: 'TODO: why the decision was made.',
      },
    ],
    next_steps: [
      {
        id: 'next-0',
        title: 'TODO: next step after the strategy is filled.',
        owner: 'TODO: owner',
        status: 'pending',
      },
    ],
  };
}

function buildFillGuide(options, artifactFileName) {
  return `# ${options.targetProject} — Beagle Strategy Fill Guide

Use this pack to save tokens: the structure is already generated locally, so the agent only needs to fill the TODO fields instead of recreating the whole contract.

## Files in this pack
- \
\`${artifactFileName}\` — valid ArtifactIR starter with TODO placeholders
- \
\`fill-guide.md\` — this guide
- \
\`render.sh\` — helper script to validate and render after filling

## Fill order
1. repo_grounding (prefer a repo-mapping preflight before filling this)
2. mandatory_gates
3. scenarios
4. skill_mapping
5. chosen_skills
6. evidence_model
7. implementation_plan
8. implementation_tasks
9. anti_goals / decisions / next_steps

## Important constraints
- Keep the strategy focused on repo workflows, chosen skills, artifacts, and verification.
- Use canonical chosen skill ids in \`beagle-<group>:<skill>\` form.
- Keep every scenario grounded in real repo surfaces.
- Keep verification commands concrete and runnable where possible.

## Recommended local workflow
1. Fill the TODO values in \`${artifactFileName}\`.
2. Run \`./render.sh\` from this pack directory.
3. Open the rendered HTML files in a browser.
4. Iterate on the JSON until the bundle looks right.
`;
}

function buildRenderHelper(artifactFileName) {
  return `#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"
ARTIFACT_PATH="$(cd "$(dirname "$0")" && pwd)/${artifactFileName}"
OUTPUT_DIR="$(cd "$(dirname "$0")" && pwd)/rendered"

cd "$ROOT_DIR"
node plugins/beagle-strategy/scripts/validate-artifact-ir.mjs "$ARTIFACT_PATH"
node plugins/beagle-strategy/scripts/render-artifact-bundle.mjs "$ARTIFACT_PATH" "$OUTPUT_DIR"
echo "Rendered bundle under: $OUTPUT_DIR"
`;
}

function main(argv) {
  const options = parseArgs(argv);
  const slug = slugify(options.targetProject);
  const packDir = path.resolve(options.outputDir, slug);
  const artifactFileName = `${slug}.artifact-ir.json`;

  ensureDir(packDir);

  fs.writeFileSync(path.join(packDir, artifactFileName), `${JSON.stringify(buildArtifactIRTemplate(options), null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(packDir, 'fill-guide.md'), buildFillGuide(options, artifactFileName), 'utf8');
  fs.writeFileSync(path.join(packDir, 'render.sh'), buildRenderHelper(artifactFileName), { encoding: 'utf8', mode: 0o755 });

  console.log(`Created Beagle strategy template pack at ${packDir}`);
  console.log(`- artifact_ir: ${artifactFileName}`);
  console.log('- fill_guide: fill-guide.md');
  console.log('- render_helper: render.sh');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main(process.argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
