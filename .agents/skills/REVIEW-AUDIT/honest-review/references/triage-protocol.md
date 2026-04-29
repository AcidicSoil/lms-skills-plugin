# Wave 0 Triage Protocol

Scan the project, analyze git history, stratify risk, and assemble context before any reviewer touches code.
Run as the first action in every Mode 2 full codebase audit.

## Contents

- [Project Scanning](#project-scanning)
- [Git History Analysis](#git-history-analysis)
- [Risk Stratification](#risk-stratification)
- [Dependency Graph Construction](#dependency-graph-construction)
- [Content Type Detection](#content-type-detection)
- [Context Assembly](#context-assembly)
- [Triage Output Template](#triage-output-template)

## Project Scanning

Invoke the scanner to generate a structured JSON project profile:

```bash
uv run scripts/project-scanner.py [path]
```

Detected fields: language(s), framework(s), build system, test framework, package manager, file count, LOC per file, max nesting depth, and estimated cyclomatic complexity (max/mean per file).

If the scanner is unavailable, gather equivalent data manually:

```bash
find [path] -type f | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -15   # files by extension
find [path] -type f \( -name '*.py' -o -name '*.ts' -o -name '*.go' \) | xargs wc -l | sort -rn | head -20  # LOC
ls [path]/package.json [path]/pyproject.toml [path]/Cargo.toml [path]/go.mod 2>/dev/null  # package managers
```

### Convention File Detection

Check for AI agent instruction files — review against project's own conventions:

```bash
ls [path]/AGENTS.md [path]/CLAUDE.md [path]/GEMINI.md [path]/.cursorrules [path]/.github/copilot-instructions.md 2>/dev/null
```

If found, include in triage context. Reviewers should validate:

- Code follows conventions declared in these files
- New code doesn't introduce patterns explicitly prohibited by project rules
- Agent-specific configurations are consistent across files

### Spec Auto-Detection

Also search for spec context to activate the Requirements Validator in Wave 1:

- **PR mode**: extract PR description and body text of linked GitHub issues:
  ```bash
  gh pr view --json title,body,closingIssuesReferences
  gh issue view [number] --json title,body
  ```
- **Repo scan**: look for SPEC.md, `specs/`, `docs/`, or README.md sections containing acceptance criteria or requirements headings
- **Commit messages**: recent commit bodies may reference tickets or acceptance criteria:
  ```bash
  git log --since="30 days ago" --format="%B" | grep -i -E "closes|fixes|resolves|AC:|acceptance|requirement"
  ```

Any detected spec context → store in TRIAGE REPORT and activate Requirements Validator in the Wave 1 team.

### Monorepo Workspace Detection

Detect workspace structures for review scope management:

```bash
# Node workspaces
cat [path]/package.json | jq '.workspaces // empty'
# Python workspaces (uv)
grep -A5 '\[tool.uv.workspace\]' [path]/pyproject.toml
# Rust workspaces
grep -A5 '\[workspace\]' [path]/Cargo.toml
# Go workspaces
cat [path]/go.work 2>/dev/null
```

For monorepo reviews:

- Scope each reviewer to their workspace package boundaries
- Flag cross-package imports that bypass workspace boundaries
- Adjust review depth per package based on independent risk stratification

## Git History Analysis

Spawn three parallel opus subagents, one per dimension, in a single message. Collect all results before proceeding to risk stratification.

**Hot files** -- 20 most frequently changed files in 90 days (top 10% = high-churn):

```bash
git log --since="90 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20
```

**Recent changes** -- files changed in last 2 weeks get priority boost (overrides historical churn):

```bash
git log --since="14 days ago" --name-only --pretty=format: | sort -u
```

**Related issues** -- open bugs in touched areas indicate known instability:

```bash
gh issue list --state open --limit 50 --json title,number,labels,body
```

Cross-reference issue titles/bodies against hot file paths. Elevate matching files to HIGH risk.

## Risk Stratification

Assign every in-scope file to a tier using scanning metrics and git signals.

**HIGH** -- any trigger fires: touches auth/payments/crypto/user-data/external-I/O; max nesting >= 5; top 10% churn; LOC > 300; open bugs referencing the file; fan-in >= 5 (imported by 5+ files).
Route: deep specialist review with research validation. Activate context-dependent checklists (security, resilience, data migration as applicable).

**MEDIUM** -- no HIGH trigger, but any of: business logic, data models, or API handlers; moderate complexity (nesting 3-4, LOC 50-300); above-median churn.
Route: standard review at all three levels. Research-validate non-obvious findings only.

**LOW** -- all of: config/docs/static assets/simple utilities; LOC < 50; below-median churn; no open issues.
Route: quick scan only. Flag obvious defects. Skip deep analysis and creative lenses.

## Dependency Graph Construction

Build a cross-file dependency graph to inform blast radius and impact analysis.
Run `scripts/project-scanner.py` which includes dependency graph output, or extract manually.

**When to build:**
- Full codebase audit (Mode 2): always
- Session review with 6+ files: always
- Session review with 3-5 files: build if any file is HIGH risk
- Session review with 1-2 files: skip

**Fan-in risk adjustment:**
Files with high fan-in (many importers) carry elevated blast radius:

| Fan-in | Risk Adjustment |
|--------|----------------|
| 5-9 importers | +2 risk points (elevates to HIGH or MEDIUM) |
| 10+ importers | Automatic HIGH risk |

**Changed files with external importers:**
When a changed file has importers NOT in the change set, flag for cross-file impact review.
These are the most likely sources of integration-related defects.

See references/dependency-context.md for construction commands and graph structure.

> Fan-in data continues to flow to blast radius calculation in findings. The fan-in risk points that previously fed the depth score are simply dropped — the dependency graph construction itself is unchanged.

## Content Type Detection

Two-pass analysis of each changed/reviewed file to determine which specialists and reviewers to activate.

**Pass 1 — Path/extension heuristics** (no file reading, instant):

- `*.test.*` / `*_test.*` / `*.spec.*` / `tests/` / `__tests__/` / `spec/` → test files present
- `*.tsx` / `*.jsx` / `*.vue` / `*.svelte` / `*.css` / `*.scss` / `*.html` → UI/frontend
- `migrations/` / `alembic/` / `flyway/` / `*.sql` / `*.migration.*` → data migration
- `auth/` / `oauth/` / `jwt/` / `crypto/` / `session/` / `password/` / `login/` → auth/security
- `routes/` / `api/` / `controllers/` / `handlers/` / `endpoints/` → API/observability
- `SPEC.md` / `specs/` / `docs/` in scope; PR description exists; linked issues found → spec context

**Pass 2 — Import/keyword scan** (read first 30-50 lines per ambiguous file):

- Crypto/hash imports (`bcrypt`, `hashlib`, `crypto`, `jwt`, `hmac`) → Security Specialist
- Payment SDK imports (`stripe`, `paypal`, `braintree`, `adyen`) → Security Specialist
- ORM/DB schema imports (`sqlalchemy`, `prisma`, `sequelize`, `alembic`) → Data Migration Specialist
- Framework request/response imports (`fastapi`, `flask`, `express`, `django.http`) → Observability Specialist
- UI framework imports (`react`, `vue`, `angular`, `svelte`, `tailwind`) → Frontend Specialist

**Trigger mapping**:

- Any diff → Code Reuse Reviewer + Test Quality Reviewer (always)
- Test files detected → Test Quality Reviewer in full 4-dimension mode
- Auth/security signals → Security Specialist
- API/service signals → Observability Specialist
- Migration signals → Data Migration Specialist
- UI signals → Frontend Specialist
- Spec context found → Requirements Validator

Emit the full trigger list and detection evidence in the TRIAGE REPORT. Team lead uses this to compose the Wave 1 team.

## Context Assembly

Gather project-level context that calibrates severity and informs reviewer prompts.

**Project type** -- classify to set severity bar (see SKILL.md, Review Posture):

- Prototype (no CI, few tests, single contributor): P0/S0 only
- Production (CI, test suite, multiple contributors, deploy config): full review
- Library (published package, public API, semver, changelog): full review + backward compatibility

**Architecture overview** -- record entry points, top-level dependency graph, external dependencies (DBs, APIs, queues), and layering boundaries.

**Test coverage summary:**

```bash
find [path] -name '*test*' -o -name '*spec*' | wc -l          # test files
find [path] \( -name '*.py' -o -name '*.ts' \) | grep -v test | wc -l  # source files
```

Note whether tests exist for HIGH-risk files specifically; ratio alone is insufficient.

**Recent PR history** -- check last 10 merged PRs for recurring change areas and review patterns:

```bash
gh pr list --state merged --limit 10 --json title,number,additions,deletions,changedFiles
```

## Triage Output Template

Produce this output at the end of Wave 0. Pass to all Wave 1 reviewers.

```
TRIAGE REPORT
=============
PROJECT PROFILE:
  Language(s): [primary, secondary]  |  Framework(s): [web, test, ORM]
  Build: [system]  |  Pkg mgr: [detected]
  Files: [N]  |  LOC: [N]  |  Type: [prototype | production | library]

GIT SIGNALS:
  Hot files (top 5): [path] — [N] commits (90d)
  Recently changed (14d): [N] files
  Open issues in touched areas: [N]

RISK-SORTED FILE LIST:
  HIGH ([N] files):
    [path] — triggers: [auth, LOC>300, fan-in>=5] → specialist review
  MEDIUM ([N] files):
    [path] — triggers: [business logic, moderate churn] → standard review
  LOW ([N] files):
    [path] — triggers: [config, LOC<50] → quick scan

CONTENT TYPE SIGNALS:
  Test files present: [yes | no]
  Auth/security code: [yes | no]
  UI/frontend code: [yes | no]
  Data migration files: [yes | no]
  API/service handlers: [yes | no]
  Spec context found: [yes | no — source: PR description | linked issues | SPEC.md | docs/]

SPECIALIST TRIGGERS:
  [x] Code Reuse Reviewer — always active
  [x] Test Quality Reviewer — always active ([full 4-dimension mode] if test files detected)
  [ ] Security Specialist — auth/payments/crypto/user-data signals detected
  [ ] Observability Specialist — API/service handler signals detected
  [ ] Frontend Specialist — UI/frontend signals detected
  [ ] Data Migration Specialist — migration signals detected
  [ ] Requirements Validator — spec context found
  [ ] Resilience Reviewer — external I/O or distributed patterns detected
  [ ] Dependency Auditor — [N]+ deps, [N] outdated
  [ ] Backward Compat Reviewer — public API surface changes detected

DEPENDENCY GRAPH:
  Total cross-file dependencies: [N]
  High fan-in files (5+ importers):
    [path] — imported by [N] files
  Changed files with external importers:
    [path] — [N] importers not in change set

CONTEXT FOR REVIEWERS:
  Entry points: [list]
  Architecture: [brief layering description]
  Test coverage: [N] test / [N] source ([ratio])
  PR patterns: [brief summary]
```

Check each applicable specialist box. The lead uses this to determine team composition (see references/team-templates.md) and write targeted teammate prompts with the correct severity bar and checklist selection.

Cross-references: scripts/project-scanner.py, references/team-templates.md.
