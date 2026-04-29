---
name: honest-review
description: >-
  Confidence-scored code review with evidence validation. Session or full
  codebase audit. Use when reviewing changes or auditing quality. NOT for
  writing code or benchmarking.
argument-hint: "[path | audit | PR#]"
license: MIT
metadata:
  author: wyattowalsh
  version: "5.0"
model: sonnet
hooks:
  PreToolUse:
    - matcher: Edit
      hooks:
        - command: 'bash -c ''if git diff --quiet "$TOOL_INPUT_file_path" 2>/dev/null; then exit 0; else echo "WARNING: $(basename "$TOOL_INPUT_file_path") has uncommitted changes" >&2; exit 0; fi'''
  PostToolUse:
    - matcher: Edit
      hooks:
        - command: 'bash -c ''git diff --stat "$TOOL_INPUT_file_path" 2>/dev/null || true'''
---

# Honest Review

Research-driven code review. Every finding validated with evidence.
4-wave pipeline: Triage → Analysis → Research → Judge.

**Scope:** Code review and audit only. NOT for writing new code, explaining code, or benchmarking.

## Canonical Vocabulary

Use these terms exactly throughout both modes:

| Term                     | Definition                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **triage**               | Wave 0: risk-stratify files (HIGH/MEDIUM/LOW) and determine specialist triggers before analysis                                            |
| **wave**                 | A pipeline stage: Wave 0 (Triage), Wave 1 (Analysis), Wave 2 (Research), Wave 3 (Judge)                                                    |
| **finding**              | A discrete code issue with severity, confidence score, evidence, and citation                                                              |
| **confidence**           | Score 0.0-1.0 per finding; >=0.7 report, 0.3-0.7 unconfirmed, <0.3 discard (except P0/S0)                                                  |
| **severity**             | Priority (P0-P3) and scope (S0-S3) classification of a finding's impact                                                                    |
| **judge**                | Wave 3 reconciliation: normalize, cluster, deduplicate, filter, resolve conflicts, rank findings                                           |
| **lens**                 | A creative review perspective: Inversion, Deletion, Newcomer, Incident, Evolution, Adversary, Compliance, Dependency, Cost, Sustainability |
| **blast radius**         | How many files, users, or systems a finding's defect could affect                                                                          |
| **slopsquatting**        | AI-hallucinated package names in dependencies — security-critical, checked first in Wave 2                                                 |
| **research validation**  | Core differentiator: every non-trivial finding confirmed with external evidence (Context7, WebSearch, DeepWiki, gh). Two evidence tiers: fact evidence (Grep) for reuse/simplification findings; assumption evidence (external research) for correctness, security, and non-obvious design. |
| **systemic finding**     | A pattern appearing in 3+ files, elevated from individual findings during Judge reconciliation                                             |
| **approval gate**        | Mandatory pause after presenting findings — never implement fixes without user consent                                                     |
| **pass**                 | Internal teammate stage (Pass A: scan, Pass B: deep dive, Pass C: research) — distinct from pipeline waves                                 |
| **self-verification**    | Wave 3.5: adversarial pass on top findings to reduce false positives (references/self-verification.md)                                     |
| **convention awareness** | Check for AGENTS.md/CLAUDE.md/.cursorrules — review against project's own agent instructions                                               |
| **code reuse finding**   | newly written code duplicating existing functionality; must cite existing implementation at file:line.                                      |
| **fact evidence**        | Grep result confirming X exists/doesn't exist in the codebase. Sufficient for reuse/simplification findings — no external research required. |
| **assumption evidence**  | external research (WebSearch, Context7) confirming a pattern is harmful. Required for correctness, security, and non-obvious design findings. |
| **degraded mode**        | Operation when research tools are unavailable — confidence ceilings applied per tool                                                       |
| **review depth**         | honest-review always operates at maximum depth — all lenses, full research validation, full team; team composition is content-adaptive (file types determine specialist selection). |
| **reasoning chain**      | Mandatory explanation of WHY before the finding statement. Reduces false positives.                                                         |
| **citation anchor**      | `[file:start-end]` reference linking a finding to specific source lines. Mechanically verified.                                             |
| **conventional comment** | Structured PR output label: praise/nitpick/suggestion/issue/todo/question/thought with (blocking)/(non-blocking) decoration.                |
| **dependency graph**     | Import/export map built during Wave 0 triage. Informs blast radius and cross-file impact.                                                   |
| **learning**             | A stored false-positive dismissal that suppresses similar future findings. Scoped per project.                                              |

## Dispatch

| $ARGUMENTS                            | Mode                                                       |
| ------------------------------------- | ---------------------------------------------------------- |
| Empty + changes in session (git diff) | Session review of changed files                            |
| Empty + no changes (first message)    | Full codebase audit                                        |
| File or directory path                | Scoped review of that path                                 |
| "audit"                               | Force full codebase audit                                  |
| PR number/URL                         | Review PR changes (gh pr diff)                             |
| Git range (HEAD~3..HEAD)              | Review changes in that range                               |
| "history" [project]                   | Show review history for project                            |
| "diff" or "delta" [project]           | Compare current vs. previous review                        |
| `--format sarif` (with any mode)      | Output findings in SARIF v2.1 (references/sarif-output.md) |
| "learnings" [command]                 | Manage false-positive learnings (add/list/clear)           |
| `--format conventional` (with any mode) | Output findings in Conventional Comments format          |
| Unrecognized input                    | Ask for clarification                                      |

## Review Posture

**Severity calibration by project type**:

- Prototype: report P0/S0 only. Skip style, structure, and optimization concerns.
- Production: full review at all levels and severities.
- Library: full review plus backward compatibility focus on public API surfaces.

**Confidence-calibrated reporting**:
Every finding carries a confidence score (0.0-1.0). Confidence ≥ 0.7: report.
Confidence 0.3-0.7: report as "unconfirmed". Confidence < 0.3: discard (except P0/S0).
Rubric: references/research-playbook.md § Confidence Scoring Rubric.

**Strengths acknowledgment**:
Call out well-engineered patterns, clean abstractions, and thoughtful design.
Minimum one strength per review scope. Strengths are findings too.

**Positive-to-constructive ratio**:
Target 3:1. Avoid purely negative reports. If the ratio skews negative,
re-examine whether low-severity findings are worth reporting.
Exception: when 3+ P0/P1 findings are present, report all critical findings without reducing them to meet the ratio — critical issues are never suppressed for balance.

**Convention-respecting stance**:
Review against the codebase's own standards, not an ideal standard.

**Healthy codebase acknowledgment**:
If no P0/P1 or S0 findings: state this explicitly. A short report is a good report.

## Scaling Contract

- Small scoped reviews still use the full content-adaptive reviewer set; only the triage depth becomes lighter.
- Session Review and Full Audit share one core scaling rule: maximum review depth, content-adaptive reviewers, and no inline-only shortcut.
- Large full-codebase audits may split ownership by domain or risk tier, but that does not weaken the evidence-validation or reasoning-first output contract.
- Read-only review output stops at findings, strengths, and next-step recommendations; implementation summaries appear only after explicit approval and a fix pass.

## Review Levels (Both Modes)

Three abstraction levels, each examining defects and unnecessary complexity:

**Correctness** (does it work?):
Error handling, boundary conditions, security, API misuse, concurrency, resource leaks.
Simplify: phantom error handling, defensive checks for impossible states, dead error paths. TOCTOU anti-pattern: existence checks before operations create race conditions — operate directly, handle the error.

**Design** (is it well-built?):
Abstraction quality, coupling, cohesion, test quality, cognitive complexity.
Simplify: dead code, 1:1 wrappers, single-use abstractions, over-engineering. Stringly-typed (raw strings where constants/enums already exist). Parameter sprawl (new params instead of restructuring). Redundant state (duplicates existing state or derivable). Copy-paste variation (near-identical blocks that should be unified).

**Efficiency** (is it economical?):
Algorithmic complexity, N+1, data structure choice, resource usage, caching.
Simplify: unnecessary serialization, redundant computation, premature optimization. Hot-path bloat (blocking work on startup or per-request paths). Missed concurrency (independent ops run sequentially). Overly broad operations (reading entire file/collection when only a subset is needed). Unbounded structures / event-listener leaks.

Context-dependent triggers (apply when relevant):

- Security: auth, payments, user data, file I/O, network
- Observability: services, APIs, long-running processes
- AI code smells: LLM-generated code, unfamiliar dependencies
- Config and secrets: environment config, credentials, .env files
- Resilience: distributed systems, external dependencies, queues
- i18n and accessibility: user-facing UI, localized content
- Data migration: schema changes, data transformations
- Backward compatibility: public APIs, libraries, shared contracts
- Infrastructure as code: cloud resources, containers, CI/CD, deployment config
- Requirements validation: changes against stated intent, PR description, ticket
  Full checklists: read references/checklists.md

## Creative Lenses

Apply at least 2 lenses per review scope. For security-sensitive code, Adversary is mandatory.

- **Inversion**: assume the code is wrong — what would break first?
- **Deletion**: remove each unit — does anything else notice?
- **Newcomer**: read as a first-time contributor — where do you get lost?
- **Incident**: imagine a 3 AM page — what path led here?
- **Evolution**: fast-forward 6 months of feature growth — what becomes brittle?
- **Adversary**: what would an attacker do with this code?
- **Compliance**: does this code meet regulatory requirements?
- **Dependency**: is the dependency graph healthy?
- **Cost**: what does this cost to run?
- **Sustainability**: will this scale without linear cost growth?

Reference: read references/review-lenses.md

## Finding Structure

Every finding must follow this order:

1. **Citation anchor**: `[file:start-end]` — exact source location
2. **Reasoning chain**: WHY this is a problem (2-3 sentences, written BEFORE the finding)
3. **Finding statement**: WHAT the problem is (1 sentence)
4. **Evidence**: External validation source (Context7, WebSearch, etc.)
5. **Fix**: Recommended approach

Never state a finding without first explaining the reasoning.
Citation anchors are mechanically verified — the referenced lines must exist and contain
the described code. If verification fails, discard the finding.

## Research Validation

THIS IS THE CORE DIFFERENTIATOR. Do not report findings based solely
on LLM knowledge. For every non-trivial finding, validate with research:

**Three-phase review per scope**:

1. **Flag phase**: Analyze code, generate hypotheses
2. **Verify phase**: Before reporting, use tool calls to confirm assumptions:
   - Grep for actual usage patterns claimed in the finding
   - Read the actual file to confirm cited lines and context
   - Check test files for coverage of the flagged code path
   - If code does not match the hypothesis, discard immediately
3. **Validate phase**: Spawn research subagents to confirm with evidence:
   - Context7: library docs for API correctness
   - WebSearch (Brave, DuckDuckGo, Exa): best practices, security advisories
   - DeepWiki: unfamiliar repo architecture and design patterns
   - WebFetch: package registries (npm, PyPI, crates.io)
   - gh: open issues, security advisories
4. Assign confidence score (0.0-1.0) per Confidence Scoring Rubric
5. Only report findings with evidence. Cite sources.

> **Two evidence tiers:** *Fact evidence* — Grep confirms X exists/doesn't in the codebase; sufficient for reuse and simplification findings. *Assumption evidence* — external research confirming a pattern is harmful; required for correctness, security, and non-obvious design. When in doubt: if the finding can be fully proven or disproven by reading the codebase alone, fact evidence suffices.

Research playbook: read references/research-playbook.md

## Mode 1: Session Review

### Session Step 1: Triage (Wave 0)

Run `git diff --name-only HEAD` to capture changes. Collect `git diff HEAD` for context.
Identify task intent from session history.
Detect convention files (AGENTS.md, CLAUDE.md, .cursorrules) — see `references/triage-protocol.md`.

For 6+ files: run triage per references/triage-protocol.md:

- `uv run scripts/project-scanner.py [path]` for project profile
- Git history analysis (hot files, recent changes, related issues)
- Risk-stratify all changed files (HIGH/MEDIUM/LOW)
- Determine specialist triggers (security, observability, requirements)
- Detect monorepo workspaces and scope reviewers per package

For 1-5 files: lightweight triage — classify risk levels and run content type detection; do not skip full team composition. (Note: always-maximum-depth applies to team effort; triage for small reviews can still skip git history analysis steps to save time.)

### Session Step 2: Scale and Launch (Wave 1)

| Scope     | Strategy                                                                    |
| --------- | --------------------------------------------------------------------------- |
| Any scope | Content-adaptive team (see below). Always maximum depth. No inline-only mode. |

**Content-adaptive team composition:**

Always spawn:
- Correctness Reviewer → Passes A/B/C
- Design Reviewer → Passes A/B/C
- Efficiency Reviewer → Passes A/B/C
- Code Reuse Reviewer → Passes A/B/C
- Test Quality Reviewer → Passes A/B/C (always spawns — scope depends on what's present — see template)

Spawn when triggered by triage content detection:
- Security Specialist → when auth/payments/crypto/user-data/external-I/O code present
- Observability Specialist → when service/API/long-running process code present
- Requirements Validator → when spec auto-detected (PR description, linked issues, SPEC.md, docs/, commit messages)
- Data Migration Specialist → when schema change files present
- Frontend Specialist → when UI/component files (tsx, jsx, css, vue) present

```
[Lead: triage (Wave 0), Judge reconciliation (Wave 3), final report]
  |-- Correctness Reviewer → Passes A/B/C
  |-- Design Reviewer → Passes A/B/C
  |-- Efficiency Reviewer → Passes A/B/C
  |-- Code Reuse Reviewer → Passes A/B/C
  |-- Test Quality Reviewer → Passes A/B/C
  |-- [Security Specialist if triage triggers]
  |-- [Observability Specialist if triage triggers]
  |-- [Requirements Validator if spec auto-detected]
  |-- [Data Migration Specialist if schema changes present]
  |-- [Frontend Specialist if UI/component files present]
```

Each reviewer runs 3 internal passes (references/team-templates.md § Internal Pass Structure):

- Pass A: quick scan all files (opus, 3-5 files per subagent)
- Pass B: deep dive HIGH-risk flagged files (opus, 1 per file)
- Pass C: research validate findings (batched per research-playbook.md)

Prompt templates: read references/team-templates.md

### Session Step 3: Research Validate (Wave 2)

For inline/small reviews: lead collects all findings and dispatches validation wave.
For team reviews: each teammate handles validation internally (Pass C).

Batch findings by validation type. Dispatch order:

1. Slopsquatting detection (security-critical, opus)
2. HIGH-risk findings (2+ sources, sonnet)
3. MEDIUM-risk findings (1 source, opus)
4. Skip LOW-risk obvious issues

Batch sizing: 5-8 findings per subagent (optimal). See references/research-playbook.md § Batch Optimization.

### Session Step 4: Judge Reconcile (Wave 3)

Run the 8-step Judge protocol (references/judge-protocol.md):

1. Normalize findings (scripts/finding-formatter.py assigns HR-S-{seq} IDs)
2. Cluster by root cause
3. Deduplicate within clusters
4. Confidence filter (≥0.7 report, 0.3-0.7 unconfirmed, <0.3 discard)
5. Resolve conflicts between contradicting findings
6. Check interactions (fixing A worsens B? fixing A fixes B?)
7. Elevate patterns in 3+ files to systemic findings
8. Rank by score = severity_weight × confidence × blast_radius

If 2+ findings survive, run self-verification (Wave 3.5): references/self-verification.md

### Session Step 5: Present and Execute

Present all findings with evidence, confidence scores, and citations.
After presenting findings, ask: "Which findings should I create a fix plan for? [all / select by ID / skip]"
If approved: Generate an orchestration implementation plan for the selected findings using Pattern E (TeamCreate + nested subagent waves). No token budget caps. Create a TaskList entry per finding. Dispatch fixes in parallel where independent; sequential only when same-file edits conflict. Verify after all tasks complete (build, tests, behavior). See references/auto-fix-protocol.md for orchestration template.
Output format: read references/output-formats.md
For SARIF output: read references/sarif-output.md

## Mode 2: Full Codebase Audit

### Audit Step 1: Triage (Wave 0)

Full triage per references/triage-protocol.md:

- `uv run scripts/project-scanner.py [path]` for project profile
- Git history analysis (3 parallel opus subagents: hot files, recent changes, related issues)
- Risk-stratify all files (HIGH/MEDIUM/LOW)
- Context assembly (project type, architecture, test coverage, PR history)
- Determine specialist triggers for team composition

For 500+ files: prioritize HIGH-risk, recently modified, entry points, public API.
State scope limits in report.

### Audit Step 2: Design and Launch Team (Wave 1)

Use triage results to select team composition. Apply the same content-adaptive team as Session Review.
Assign file ownership based on risk stratification — HIGH-risk files get domain reviewer + specialist coverage.

| Scope     | Strategy                                                                    |
| --------- | --------------------------------------------------------------------------- |
| Any scope | Content-adaptive team (see below). Always maximum depth. No inline-only mode. |

**Content-adaptive team composition:**

Always spawn:
- Correctness Reviewer → Passes A/B/C
- Design Reviewer → Passes A/B/C
- Efficiency Reviewer → Passes A/B/C
- Code Reuse Reviewer → Passes A/B/C
- Test Quality Reviewer → Passes A/B/C (always spawns — scope depends on what's present — see template)

Spawn when triggered by triage content detection:
- Security Specialist → when auth/payments/crypto/user-data/external-I/O code present
- Observability Specialist → when service/API/long-running process code present
- Requirements Validator → when spec auto-detected (PR description, linked issues, SPEC.md, docs/, commit messages)
- Data Migration Specialist → when schema change files present
- Frontend Specialist → when UI/component files (tsx, jsx, css, vue) present

```
[Lead: triage (Wave 0), cross-domain analysis, Judge reconciliation (Wave 3), report]
  |-- Correctness Reviewer → Passes A/B/C
  |-- Design Reviewer → Passes A/B/C
  |-- Efficiency Reviewer → Passes A/B/C
  |-- Code Reuse Reviewer → Passes A/B/C
  |-- Test Quality Reviewer → Passes A/B/C
  |-- [Security Specialist if triage triggers]
  |-- [Observability Specialist if triage triggers]
  |-- [Requirements Validator if spec auto-detected]
  |-- [Data Migration Specialist if schema changes present]
  |-- [Frontend Specialist if UI/component files present]
```

*Audit-only scoping for large codebases (500+ files):* the core reviewers (Correctness, Design, Efficiency) split file ownership by risk tier; Code Reuse Reviewer is scoped to changed/HIGH-risk files plus a sampled cross-section (top 50 files by fan-in and LOC) — not the entire codebase; Test Quality Reviewer focuses on test files that cover changed/HIGH-risk code. Lead continues to run cross-domain analysis in parallel (Audit Step 3 — unchanged). The 500+ file splitting rule does NOT apply in Session Review mode (which always operates on a bounded diff).

Each teammate runs 3 internal passes (references/team-templates.md § Internal Pass Structure).
Scaling: references/team-templates.md § Scaling Matrix.

### Audit Step 3: Cross-Domain Analysis (Lead, parallel with Wave 1)

While teammates review, lead spawns parallel subagents for:

- Architecture: module boundaries, dependency graph
- Data flow: trace key paths end-to-end
- Error propagation: consistency across system
- Shared patterns: duplication vs. necessary abstraction

### Audit Step 4: Research Validate (Wave 2)

Each teammate handles research validation internally (Pass C).
Lead validates cross-domain findings separately.
Batch optimization: references/research-playbook.md § Batch Optimization.

### Audit Step 5: Judge Reconcile (Wave 3)

Collect all findings from all teammates + cross-domain analysis.
Run the 8-step Judge protocol (references/judge-protocol.md).
Cross-domain deduplication: findings spanning multiple domains → elevate to systemic.

### Audit Step 6: Report

Output format: read references/output-formats.md
Required sections: Critical, Significant, Cross-Domain, Health Summary,
Top 3 Recommendations, Statistics. All findings include evidence + citations.

### Audit Step 7: Execute (If Approved)

After presenting findings, ask: "Which findings should I create a fix plan for? [all / select by ID / skip]"
If approved: Generate an orchestration implementation plan for the selected findings using Pattern E (TeamCreate + nested subagent waves). No token budget caps. Create a TaskList entry per finding. Dispatch fixes in parallel where independent; sequential only when same-file edits conflict. Verify after all tasks complete (build, tests, behavior). See references/auto-fix-protocol.md for orchestration template.

## Reference Files

Load ONE reference at a time. Do not preload all references into context.

| File                                | When to Read                                                  | ~Tokens |
| ----------------------------------- | ------------------------------------------------------------- | ------- |
| references/triage-protocol.md       | During Wave 0 triage (both modes)                             | 1500    |
| references/checklists.md            | During analysis or building teammate prompts                  | 2800    |
| references/research-playbook.md     | When setting up research validation (Wave 2)                  | 2200    |
| references/judge-protocol.md        | During Judge reconciliation (Wave 3)                          | 1200    |
| references/self-verification.md     | After Judge (Wave 3.5) — adversarial false-positive reduction | 900     |
| references/auto-fix-protocol.md     | When implementing fixes after approval                        | 800     |
| references/output-formats.md        | When producing final output                                   | 1100    |
| references/sarif-output.md          | When outputting SARIF format for CI tooling                   | 700     |
| references/supply-chain-security.md | When reviewing dependency security                            | 1000    |
| references/team-templates.md        | When designing teams (Mode 2 or large Mode 1)                 | 2200    |
| references/review-lenses.md         | When applying creative review lenses                          | 1600    |
| references/ci-integration.md        | When running in CI pipelines                                  | 700     |
| references/conventional-comments.md | When producing PR comments or CI annotations              | 400     |
| references/dependency-context.md    | During Wave 0 triage for cross-file dependency analysis   | 500     |

| Script                       | When to Run                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------ |
| scripts/project-scanner.py   | Wave 0 triage — deterministic project profiling                                |
| scripts/finding-formatter.py | Wave 3 Judge — normalize findings to structured JSON (supports --format sarif) |
| scripts/review-store.py      | Save, load, list, diff review history                                          |
| scripts/sarif-uploader.py    | Upload SARIF results to GitHub Code Scanning                                   |
| scripts/learnings-store.py   | Manage false-positive learnings (add, check, list, clear)              |

| Template                 | When to Render                                                  |
| ------------------------ | --------------------------------------------------------------- |
| templates/dashboard.html | After Judge reconciliation — inject findings JSON into data tag |

## Critical Rules

1. Never skip triage (Wave 0) — risk classification informs everything downstream
2. Every non-trivial finding must have research evidence or be discarded
3. Confidence < 0.3 = discard (except P0/S0 — report as unconfirmed)
4. Do not police style preferences — follow the codebase's conventions. Exception: violations of agent behavior rules in AGENTS.md/CLAUDE.md (toolchain, auth, secrets, safety-critical directives) are findings at the Convention Violations tier severity. Pure style rules (formatting, naming) are never policed.
5. Do not report phantom bugs requiring impossible conditions
6. More than 12 findings means re-prioritize — 5 validated findings beat 50 speculative
7. Never skip Judge reconciliation (Wave 3)
8. Always present before implementing (approval gate)
9. Always verify after implementing (build, tests, behavior)
10. Never assign overlapping file ownership
11. Maintain positive-to-constructive ratio of 3:1 — re-examine low-severity findings if ratio skews negative — except when 3+ P0/P1 findings are present, in which case report all critical findings without enforcing the ratio.
12. Acknowledge healthy codebases — if no P0/P1 or S0 findings, state this explicitly
13. Apply at least 2 creative lenses per review scope — Adversary is mandatory for security-sensitive code
14. Load ONE reference file at a time — do not preload all references into context
15. Review against the codebase's own conventions, not an ideal standard
16. Run self-verification (Wave 3.5) when 2+ findings survive Judge — skip for fewer findings or fully degraded mode
17. Follow auto-fix protocol for implementing fixes — never apply without diff preview and user confirmation
18. Check for convention files (AGENTS.md, CLAUDE.md, .cursorrules) during triage — validate code against project's declared rules
19. Every finding must include a reasoning chain (WHY) before the finding statement (WHAT)
20. Every finding must include a citation anchor `[file:start-end]` mechanically verified against source
21. Check learnings store during Judge Wave 3 Step 4 — suppress findings matching stored false-positive dismissals
22. Code Reuse Reviewer runs on every review scope — always cite file:line for existing equivalents.
23. Fact evidence (Grep) is sufficient for reuse and simplification findings; no WebSearch required unless confirming why the pattern is harmful.
24. No inline-only review — always spawn the full content-adaptive team regardless of file count.
25. Test Quality Reviewer always spawns — when test files are in scope: full 4-dimension review; when no test files in scope: coverage gap search (Grep for any tests covering changed functions; flag untested code as a finding).
26. Violations of AGENTS.md/CLAUDE.md *agent behavior rules* (toolchain, auth, secrets, safety) are reported as findings — severity per the Convention Violations tier in checklists.md. Style-only preferences (formatting, naming) are still not policed per Rule 4.
27. Post-approval execution generates an orchestration plan (Pattern E) — never apply fixes sequentially; parallelize all independent changes.
