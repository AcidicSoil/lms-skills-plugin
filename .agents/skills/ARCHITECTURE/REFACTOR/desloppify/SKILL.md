---
name: desloppify
description: Use when improving repository code quality with Desloppify:\ install or verify the CLI, choose scan scope, exclude generated or vendor paths, run scans, inspect status and prioritized issues, execute the next-item fix loop, mark completed work, rescan, and report score and technical-debt progress.
metadata:
  short-description: Run Desloppify quality loops
---

# Desloppify

## Quick start

Use this skill when `{{args}}` asks to improve codebase quality, run Desloppify, raise a strict score, remove technical debt, inspect quality findings, process a Desloppify queue, configure exclusions, or integrate Desloppify into a repository workflow.

Default to a safe quality-improvement loop:

```bash
desloppify scan --path .
desloppify status
desloppify next
````

If Desloppify is not installed and package installation is permitted, use:

```bash
pip install --upgrade "desloppify[full]"
desloppify --help
```

If installation is unavailable, forbidden, or fails, record `Unknown` for Desloppify results and proceed with any static repository inspection that can be completed safely.

## Workflow

### 1. Discover structure and locate files

1. Identify the repository root.
2. Inspect the project layout before scanning.
3. Determine whether the workspace is a single coherent project or a monorepo / multi-project directory.
4. If multiple unrelated projects exist, scan each coherent project separately rather than scanning the parent directory.
5. Look for generated, vendored, build-output, dependency, cache, migration, test, or worktree paths that may distort scan results.

Common exclusion candidates:

* `node_modules`
* `dist`
* `build`
* `.next`
* `coverage`
* `.venv`
* `venv`
* `__pycache__`
* `.pytest_cache`
* generated code directories
* vendored third-party code
* large build artifacts
* unrelated worktrees

Add `.desloppify/` to `.gitignore` when repository changes are permitted, because it contains local state and should not normally be committed.

### 2. Read relevant files and evidence

Before modifying code, read:

1. The relevant Desloppify finding from `desloppify next`, `desloppify show`, or equivalent output.
2. The affected source file.
3. Nearby tests, callers, exports, imports, and configuration.
4. Existing repository conventions for naming, module boundaries, error handling, abstractions, and test patterns.
5. Any existing `.desloppify/config.json`, `.gitignore`, CI configuration, or quality-gate scripts if present.

Do not assume a finding is correct without verifying it against code.

### 3. Run safe, allowed commands

Run commands only when execution is available and permitted.

Use these commands as the primary command surface:

```bash
desloppify scan --path .
desloppify scan --path <path>
desloppify scan --profile ci --no-badge
desloppify status
desloppify next
desloppify next --count 5
desloppify next --count 20 --group file
desloppify next --scope <file-or-directory>
desloppify next --format json --output queue.json
desloppify show <file-or-directory-or-finding>
desloppify plan
desloppify fix unused --dry-run
desloppify fix unused
desloppify fix logs --dry-run
desloppify fix logs
desloppify config set target_strict_score <score>
desloppify exclude <path>
desloppify langs
```

Use `desloppify --help` and command-specific help before relying on command syntax that is not already verified in the local environment.

When a `next` item prints an exact completion command, prefer that exact command after the fix is actually completed. Some Desloppify versions present completion as `desloppify plan done ...`; older or alternate docs may refer to `resolve`. Use the command shown by the installed CLI.

### 4. Interpret `{{args}}`

Map `{{args}}` to an execution mode:

| User intent in `{{args}}`                             | Mode                                                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| “run desloppify”, “scan quality”, “baseline”          | Run scan, status, and summarize findings.                                                                                          |
| “improve score”, “fix issues”, “desloppify this repo” | Run scan, then iterate through `next` items.                                                                                       |
| “just report” or “audit”                              | Run read-only scan/status/next commands; do not edit files.                                                                        |
| “CI”, “quality gate”, “PR gate”                       | Generate or update CI plan/config only if repository conventions are clear and edits are permitted.                                |
| “monorepo” or multiple apps detected                  | Scan each coherent project path separately.                                                                                        |
| “exclude”                                             | Inspect candidates; exclude obvious generated/vendor/build paths; mark questionable paths as `TODO` instead of excluding silently. |
| “raise score to X”                                    | Set or use target score X, then fix highest-priority verified issues until scope or time is exhausted.                             |
| no scope specified                                    | Use `--path .` only if the root is a single coherent project; otherwise choose specific project paths and state the choice.        |

### 5. Produce final artifacts

Depending on the request, produce one or more of:

1. A scan summary.
2. A prioritized fix plan.
3. Code changes that resolve verified findings.
4. A Desloppify progress report.
5. A CI quality-gate patch.
6. A final audit record showing commands run, files changed, findings resolved, score movement, and remaining work.

## Decision rules

### Scope selection

* Use `desloppify scan --path .` only for a single coherent project.
* For monorepos, scan each relevant subproject separately.
* Do not scan parent directories that combine unrelated frontends, backends, tools, examples, or generated outputs unless the user explicitly requests a whole-workspace scan.
* For language-specific scans, use `--lang <language>` only when the language is known or the CLI recommends it.

### Exclusions

* Exclude obvious generated, vendored, dependency, cache, and build-output paths.
* Do not exclude source directories merely because they contain many findings.
* Do not exclude tests unless the user requested production-only cleanup or the tests are generated/vendor fixtures.
* Record questionable exclusions as `TODO` and explain why they need human confirmation.
* Prefer persistent exclusions with `desloppify exclude <path>` when repository-local Desloppify configuration is desired.
* Prefer one-off `--exclude` flags for experiments, audits, or cases where repository state should not change.

### Fix selection

Follow Desloppify’s queue rather than inventing a competing backlog:

1. Run `desloppify next`.
2. Read and verify the finding.
3. Fix the issue properly.
4. Run relevant local tests or static checks if available.
5. Run the completion command shown by Desloppify.
6. Run `desloppify next` again.
7. Rescan periodically with `desloppify scan --path <path>`.

Prioritize correctness over score movement. Do not game the score by deleting meaningful code, hiding findings, weakening tests, suppressing valid issues, or excluding legitimate source.

### Auto-fixers

* Run auto-fixers with `--dry-run` before applying changes.
* Inspect the dry-run output.
* Apply only when changes are mechanical and safe.
* After applying, review diffs and run relevant tests/checks.
* Do not run broad auto-fixes over uncommitted user work unless explicitly permitted.

### Subjective or structural findings

For naming, abstraction, module-boundary, error-handling, duplication, god component, or mixed-concern findings:

1. Read the full surrounding context.
2. Identify the smallest coherent refactor that resolves the issue.
3. Preserve public APIs unless changing them is necessary and safe.
4. Update call sites and tests.
5. Avoid large opportunistic rewrites unrelated to the finding.
6. State residual risk when behavior preservation cannot be fully verified.

### CI integration

When asked to integrate Desloppify into CI:

1. Inspect existing CI provider and conventions.
2. Prefer the repository’s current package-management and Python setup conventions.
3. Add installation and scan/status steps only when edits are permitted.
4. Use `desloppify scan --profile ci --no-badge` for CI-oriented scans unless the user asks for scorecard artifacts.
5. Fail builds only when the threshold is explicit or already configured.
6. If threshold is unknown, write `TODO: choose target_strict_score`.

### Destructive and privileged operations

Treat the following as forbidden unless explicitly permitted:

* deleting large source areas
* rewriting history
* changing public APIs broadly
* excluding real source to improve score
* committing changes
* pushing branches
* modifying production infrastructure
* installing packages globally in constrained environments

When not permitted, stop at analysis, patch preparation, or `TODO`.

## Output contract

For scan-only or audit requests, return:

```markdown
## Desloppify result

- Scope: <path-or-paths>
- Commands run:
  - `<command>`
- Current score/status: <score-or-Unknown>
- Top findings:
  1. <finding>
  2. <finding>
  3. <finding>
- Exclusions applied: <list-or-none>
- Exclusions needing confirmation: <list-or-TODO>
- Recommended next action: <one action>
```

For fix-loop requests, return:

```markdown
## Desloppify fix loop

- Scope: <path-or-paths>
- Starting score/status: <score-or-Unknown>
- Ending score/status: <score-or-Unknown>
- Commands run:
  - `<command>`
- Findings addressed:
  - `<finding-id-or-summary>` — <fixed|partially fixed|rejected|Unknown>
- Files changed:
  - `<path>` — <change summary>
- Verification:
  - `<command>` — <pass|fail|not run>
- Remaining queue:
  - <next finding or Unknown>
- Risks / TODO:
  - <item or none>
```

For CI integration requests, return:

```markdown
## Desloppify CI integration

- CI system: <detected-system-or-Unknown>
- Target score: <score-or-TODO>
- Files changed:
  - `<path>`
- Gate behavior: <block-on-score|report-only|TODO>
- Commands added:
  - `<command>`
- Verification:
  - `<command>` — <pass|fail|not run>
- TODO:
  - <item or none>
```

## Failure modes

* If Desloppify is not installed and installation is not permitted, record `Unknown` for command-derived data.
* If the CLI version differs from expected command syntax, use `desloppify --help` and installed command help as the source of truth.
* If a scan fails, capture stdout/stderr, identify the failing detector or environment prerequisite, and continue with available findings.
* If no files are found, reassess `--path`, exclusions, language detection, and project root.
* If scan output suggests reduced confidence, report the affected detector or missing optional dependency.
* If a finding cannot be verified, do not mark it done; report it as `Unknown` or `rejected` with rationale.
* If tests are unavailable, record `Verification: not run` and explain the missing command.
* If repository state is dirty before broad auto-fixes, avoid applying auto-fixes unless the user explicitly permits it.
* If required inputs are missing, write `TODO` or `Unknown` and proceed with the safest read-only workflow.

## Invocation examples

### Baseline a repository

User request:

```text
Use Desloppify to baseline this repo.
```

Expected behavior:

1. Inspect repository structure.
2. Choose scan path or paths.
3. Add no exclusions unless obvious and permitted.
4. Run scan/status/next.
5. Report score, top findings, and next action.

### Improve score by working the queue

User request:

```text
Run Desloppify and fix the next few issues.
```

Expected behavior:

1. Scan the selected project.
2. Run `desloppify next`.
3. Verify the first finding.
4. Fix it.
5. Run targeted tests/checks.
6. Run the completion command shown by Desloppify.
7. Repeat until the requested scope is complete or a blocker appears.
8. Rescan and report score movement.

### Configure exclusions

User request:

```text
Desloppify this repo but exclude generated files.
```

Expected behavior:

1. Inspect generated/vendor/build/cache candidates.
2. Exclude only obvious non-source paths.
3. Mark questionable candidates as `TODO`.
4. Run scan and report active exclusions.

### Monorepo

User request:

```text
Run Desloppify on the frontend and backend.
```

Expected behavior:

```bash
desloppify scan --path ./frontend
desloppify status
desloppify scan --path ./backend
desloppify status
```

Report each project separately.

### CI gate

User request:

```text
Add a Desloppify quality gate to CI.
```

Expected behavior:

1. Inspect current CI configuration.
2. Add CI steps consistent with existing conventions.
3. Use CI scan mode.
4. Add a threshold only if explicit or already configured.
5. Validate YAML or equivalent config syntax if a validator is available.
