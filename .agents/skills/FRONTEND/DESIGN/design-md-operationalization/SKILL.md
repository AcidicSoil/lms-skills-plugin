---
name: design-md-operationalization
description: Use when adding, generating, linting, exporting, enforcing, auditing, or remediating a repository-level DESIGN.md design-system contract for frontend repositories, including .design artifacts, package scripts, compliance skills, and UI drift audits.
metadata:
  short-description: Operationalize DESIGN.md workflows
---

# DESIGN.md Operationalization

## Quick start

Use this skill to create and operationalize a repository-level `DESIGN.md` contract for AI coding agents.

Default workflow:

1. Discover the repository structure and existing frontend styling evidence.
2. Create or update `.design/design-intake.md`.
3. Pull or refresh the `design.md` specification if command execution is available.
4. Generate `DESIGN.md` at the repository root.
5. Lint and fix `DESIGN.md`.
6. Export generated token artifacts.
7. Add package scripts when the repository uses `package.json`.
8. Create or update the repository-local `design-system-compliance` skill.
9. Commit the design baseline only when explicitly requested.
10. Audit existing UI for drift against `DESIGN.md`.
11. Remediate only high-confidence drift when requested.

Interpret free-form trailing user input as `{{args}}`.

If `{{args}}` names a repository, path, branch, package manager, framework, UI library, or scope, use that as the working constraint. If missing, use the current repository root as the target and record unknown values as `Unknown`.

## Workflow

### 1. Discover structure and locate files

From the repository root, identify whether these files or directories exist:

- `DESIGN.md`
- `.design/`
- `.design/design-intake.md`
- `.design/design-md-spec.md`
- `.design/generated/`
- `package.json`
- `.agents/skills/`
- frontend source directories such as `apps`, `packages`, `src`, or `components`
- styling files such as Tailwind config, CSS, theme files, component configuration, or UI library configuration

If command execution is available and permitted, run exactly:

```bash
find . -maxdepth 3 \
  \( -name "tailwind.config.*" \
  -o -name "globals.css" \
  -o -name "*.css" \
  -o -name "theme.*" \
  -o -name "components.json" \
  -o -name "package.json" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*"

Read the returned files before generating or modifying `DESIGN.md`.

If execution is unavailable, manually inspect available files. If files cannot be read, record `Unknown` and continue.

### 2. Create the design workspace

Ensure this directory exists:

```text
.design/generated
```

If command execution is available and permitted, create it with:

```bash
mkdir -p .design/generated
```

Do not assume the directory exists.

### 3. Pull the DESIGN.md spec

If command execution is available and permitted, run exactly:

```bash
npx --yes @google/design.md@0.1.1 spec --rules > .design/design-md-spec.md
```

Use the resulting `.design/design-md-spec.md` as the authoritative format and linting context.

If the command is unavailable, fails, or network access is blocked, record the spec as `Unknown` and continue using only the repository evidence and the user-provided task.

### 4. Create or update the design intake

Create `.design/design-intake.md` if missing.

Use this template:

```markdown
# Design Intake

## Product
Name:
Description:
Primary users:
Primary use cases:

## Brand Direction
Adjectives:
Avoided adjectives:
Comparable products/sites:
Differentiation:

## Visual Preferences
Color direction:
Typography direction:
Density:
Motion:
Shape/radius:
Layout style:

## Existing Assets
Logo:
Screenshots:
Figma:
Existing Tailwind config:
Existing CSS:
Existing component library:

## Constraints
Framework:
UI library:
Accessibility requirements:
Dark mode:
Mobile requirements:
```

Populate fields only from explicit user input or repository evidence.

If information is missing, leave the field blank or write `Unknown`. Do not invent brand direction, product positioning, UI library usage, or accessibility requirements.

### 5. Generate DESIGN.md

Generate or update only the repository-root `DESIGN.md` unless the user explicitly requests additional files.

Inputs to use, in priority order:

1. `.design/design-md-spec.md`, if available.
2. `.design/design-intake.md`, if available.
3. Existing styling files and component configuration.
4. Explicit constraints in `{{args}}`.
5. Conservative defaults only when no project evidence exists.

`DESIGN.md` requirements:

* Use YAML front matter for machine-readable tokens.
* Use Markdown body sections for human-readable rationale.
* Follow the section order from the available DESIGN.md spec when the spec is available.
* Define at minimum:

  * `name`
  * `description`
  * `colors`
  * `typography`
  * `spacing`
  * `rounded`
  * `components`
* Include component tokens for:

  * `button-primary`
  * `button-secondary`
  * `card`
  * `input`
  * `badge`
  * `navigation`
* Use token references such as `{colors.primary}` where appropriate.
* Prefer existing project tokens and styling conventions over new values.
* If the existing project has no clear token, choose a conservative default and explain it in prose.
* Include a clear "Do's and Don'ts" section for future coding agents.
* Optimize for agent usability, visual consistency, and accessibility.
* Do not create or modify Tailwind config unless explicitly requested.
* Do not modify unrelated files during this step.

### 6. Lint DESIGN.md

If command execution is available and permitted, run exactly:

```bash
npx --yes @google/design.md@0.1.1 lint DESIGN.md
```

Optionally save a lint report when fixing is needed:

```bash
npx --yes @google/design.md@0.1.1 lint DESIGN.md > .design/design-lint-report.json
```

Use lint output as evidence. Do not claim the file passes lint unless the command succeeds.

### 7. Fix lint findings

If lint returns errors or warnings:

1. Read `DESIGN.md`.
2. Read `.design/design-md-spec.md` if available.
3. Read `.design/design-lint-report.json` or captured lint output if available.
4. Fix all errors first.
5. Fix warnings only when doing so improves agent usability or accessibility.
6. Preserve intended visual identity.
7. Keep YAML valid.
8. Keep section order compliant with the spec when known.
9. Do not remove useful prose merely to silence warnings.
10. Do not add unused tokens unless they are referenced by component tokens or explained as intentional.
11. Do not modify unrelated files.

Known component YAML sub-token guidance from the source workflow:

Allowed component sub-token keys:

```text
backgroundColor
textColor
typography
rounded
padding
size
height
width
```

If interaction guidance requires richer keys such as borders, focus rings, active text colors, or focus border colors, move that guidance into Markdown prose instead of YAML.

Rerun lint until clean or until blocked by unavailable tooling.

### 8. Export token artifacts

If `DESIGN.md` exists and command execution is available and permitted, run exactly:

```bash
mkdir -p .design/generated

npx --yes @google/design.md@0.1.1 export --format tailwind DESIGN.md > .design/generated/tailwind.theme.json

npx --yes @google/design.md@0.1.1 export --format dtcg DESIGN.md > .design/generated/tokens.json
```

Then verify with:

```bash
ls -la .design/generated
```

Expected generated artifacts:

```text
tailwind.theme.json
tokens.json
```

If export fails, record stdout/stderr and do not fabricate generated token contents.

### 9. Add package scripts

Only add package scripts when `package.json` exists and the user permits repository edits.

If command execution is available and permitted, run exactly:

```bash
npm pkg set scripts.design:spec="npx --yes @google/design.md@0.1.1 spec --rules"
npm pkg set scripts.design:lint="npx --yes @google/design.md@0.1.1 lint DESIGN.md"
npm pkg set scripts.design:export:tailwind="npx --yes @google/design.md@0.1.1 export --format tailwind DESIGN.md > .design/generated/tailwind.theme.json"
npm pkg set scripts.design:export:dtcg="npx --yes @google/design.md@0.1.1 export --format dtcg DESIGN.md > .design/generated/tokens.json"
```

Verify with:

```bash
npm run design:lint
npm run design:export:tailwind
npm run design:export:dtcg
```

If the repository does not use npm, do not invent equivalent commands. Record `Unknown` and explain that package-manager adaptation is a TODO.

### 10. Create the design-system compliance skill

Create or update:

```text
.agents/skills/design-system-compliance/SKILL.md
```

Use this content unless the repository already has a stronger local convention:

```markdown
---
name: design-system-compliance
description: Use before any UI, layout, component, CSS, Tailwind, or visual design work. Enforces repo-level DESIGN.md as the visual design source of truth.
---

# Design System Compliance

## Quick start

Read `DESIGN.md` before planning or editing UI. Treat its YAML front matter as normative design tokens and its Markdown body as implementation rationale.

## Workflow

1. Read `DESIGN.md`.
2. Read existing component files relevant to the task.
3. Read existing theme, Tailwind, CSS, or component configuration.
4. Plan changes using existing tokens and components.
5. Edit only files required by the UI task.
6. Verify accessibility-sensitive foreground/background contrast, keyboard access, and focus-visible behavior.
7. Run available checks.

## Decision rules

- Treat `DESIGN.md` YAML front matter as normative.
- Treat `DESIGN.md` Markdown prose as design rationale.
- Prefer existing tokens over new values.
- Do not hardcode colors, spacing, font sizes, radii, or shadows when a token exists.
- If a required token is missing, propose a `DESIGN.md` update instead of silently inventing values.
- Preserve the visual identity described in `DESIGN.md`.
- Use component tokens for buttons, cards, inputs, badges, and navigation where applicable.
- Check foreground/background color contrast for accessibility-sensitive UI.
- Prefer existing base or shared components before creating new primitives.
- Preserve keyboard accessibility and focus-visible states.

## Output contract

For implementation tasks, report:

- Files changed
- Tokens used
- Any new token needs
- Accessibility checks performed
- Verification commands run and results

## Failure modes

- If `DESIGN.md` is missing, stop UI implementation and report `TODO: create DESIGN.md`.
- If a required token is missing, report the missing token and propose a minimal `DESIGN.md` update.
- If verification commands are unavailable or fail, report stdout/stderr or `Unknown`.
```

Do not add provider-specific metadata or config files unless explicitly requested.

### 11. Commit the baseline

Only commit when the user explicitly requests committing.

If committing is requested and command execution is available and permitted, run exactly:

```bash
git add DESIGN.md .design package.json .agents/skills/design-system-compliance/SKILL.md

git commit -m "Add DESIGN.md design system contract"
```

If any file does not exist, adjust the `git add` list to include only created or changed files. Do not invent files to satisfy the command.

### 12. Run a frontend UI audit

Run the audit only after `DESIGN.md` exists.

If the user requests a dedicated audit branch and command execution is available and permitted, run exactly:

```bash
git checkout -b design-md-ui-audit
```

If command execution is available and permitted, run this drift scan:

```bash
rg -n \
  --glob '!node_modules' \
  --glob '!dist' \
  --glob '!build' \
  --glob '!coverage' \
  '#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|oklch\(|hsl\(|style=\{\{|rounded-\[|text-\[|bg-\[|border-\[|shadow-\[' \
  apps packages src components 2>/dev/null
```

Then scan for direct primitives:

```bash
rg -n \
  --glob '!node_modules' \
  'button|input|textarea|select|className=.*cursor-pointer|onClick=' \
  apps packages src components 2>/dev/null
```

If directories such as `apps`, `packages`, `src`, or `components` are missing, inspect the actual frontend directories present in the repository. Record missing directories as `Unknown`.

Create `docs/design-ui-audit.md` with:

* Summary
* Files inspected
* Findings grouped by severity:

  * Critical
  * High
  * Medium
  * Low
* Exact file paths and line numbers where possible
* Recommended fix for each finding
* Whether the fix is safe for an automated pass

Audit rules:

* Do not propose a redesign.
* Do not introduce new fonts.
* Do not create a Tailwind config from `DESIGN.md`.
* Prefer existing base or shared components.
* Preserve the interface density, visual identity, and product constraints described in `DESIGN.md`.
* Focus on:

  * hardcoded colors
  * arbitrary Tailwind values
  * inconsistent spacing
  * inconsistent radii
  * shadow or elevation drift
  * duplicated primitives
  * buttons, inputs, cards, badges, and navigation that bypass shared components
  * missing accessible labels
  * mouse-only interactions
  * weak or removed focus-visible states
  * weak contrast

### 13. Remediate high-confidence drift

Remediate only when explicitly requested.

Before editing, read:

* `DESIGN.md`
* `docs/design-ui-audit.md`
* files referenced by Critical and High findings

Rules:

* Fix only Critical and High findings marked safe for automated remediation.
* Do not redesign screens.
* Do not restructure layout unless required for accessibility.
* Prefer existing base or shared components.
* Replace hardcoded design values with semantic classes or tokens where available.
* Preserve existing behavior.
* Preserve focus-visible states.
* Do not remove borders from dense tool surfaces.
* Do not introduce new colors, fonts, shadows, or radius values.
* Do not create a Tailwind config from `DESIGN.md`.
* If a needed design token is missing, document it as a follow-up instead of inventing one.

Verification:

* Run available typecheck, lint, or test commands from the repository.
* Run `npm run design:lint` if `DESIGN.md` changes and npm scripts exist.
* Summarize changed files and remaining design debt.

## Decision rules

* Treat `DESIGN.md` as the agent-facing visual identity contract, not a complete design-system platform.
* Treat `.design/generated/*` as derived artifacts, not primary source.
* Treat `DESIGN.md` YAML as token source of truth.
* Treat `DESIGN.md` Markdown as implementation guidance and rationale.
* Prefer existing project evidence over defaults.
* Use conservative defaults only when evidence is absent.
* Preserve existing frontend behavior unless the user requests behavior changes.
* Do not create Tailwind config from `DESIGN.md` unless explicitly requested.
* Do not invent UI library usage, frameworks, package managers, scripts, branches, or CI conventions.
* Do not hard-fail solely because optional files are missing.
* Do not perform destructive or privileged actions unless explicitly permitted.
* Do not commit, push, delete branches, overwrite unrelated files, or modify CI without explicit user instruction.

## Output contract

For generation or setup tasks, report:

* Files created or changed
* Evidence files read
* Commands run
* Lint/export results
* Unknown or unavailable inputs
* Remaining TODOs

For audit tasks, create or update `docs/design-ui-audit.md` and report:

* Files inspected
* Finding counts by severity
* Highest-risk issues
* Which findings are safe for automated remediation
* Verification status

For remediation tasks, report:

* Files changed
* Findings fixed
* Findings intentionally left unchanged
* Commands run and results
* Remaining design debt

## Failure modes

* Missing repository: write `Unknown` for repository path and proceed only with instructions or artifact generation.
* Missing `.design/design-md-spec.md`: attempt to generate it if command execution is available; otherwise record `Unknown`.
* Missing `.design/design-intake.md`: create the template and leave unknown fields blank or marked `Unknown`.
* Missing `package.json`: skip npm script setup and record `Unknown`.
* Missing frontend directories: inspect available directories; do not invent paths.
* Linter unavailable or failing: capture stdout/stderr and do not claim success.
* Export unavailable or failing: capture stdout/stderr and do not fabricate generated artifacts.
* Ambiguous requirement: choose the least destructive interpretation, state the assumption, and proceed.
* Unsupported environment capability: explain the limitation in the task output and preserve a runnable TODO.

## Invocation examples

### Generate a baseline DESIGN.md

User request:

```text
Use this skill to add DESIGN.md to the current frontend repo.
```

Expected behavior:

1. Inspect existing styling evidence.
2. Create `.design/design-intake.md` if missing.
3. Generate `.design/design-md-spec.md` when possible.
4. Create root `DESIGN.md`.
5. Lint and fix it when possible.
6. Export token artifacts when possible.

### Add compliance enforcement

User request:

```text
Create the design-system-compliance skill after generating DESIGN.md.
```

Expected behavior:

1. Verify `DESIGN.md` exists.
2. Create `.agents/skills/design-system-compliance/SKILL.md`.
3. Keep the skill generic and repository-local.
4. Avoid provider-specific runtime assumptions.

### Audit frontend drift

User request:

```text
Audit the UI against DESIGN.md and produce docs/design-ui-audit.md.
```

Expected behavior:

1. Read `DESIGN.md`.
2. Scan frontend files for token, component, product-surface, and accessibility drift.
3. Create `docs/design-ui-audit.md`.
4. Do not edit implementation files.

### Remediate safe findings

User request:

```text
Fix the Critical and High findings that are marked safe for automated remediation.
```

Expected behavior:

1. Read `DESIGN.md`.
2. Read `docs/design-ui-audit.md`.
3. Edit only files referenced by safe Critical and High findings.
4. Preserve behavior and visual identity.
5. Run available checks.
