---
name: gsd-frontend-skill-routing
description: "Use when planning or implementing browser-facing frontend/UI work that needs routing to copied frontend design skills, including accessibility, responsive layout, UI components, interaction patterns, Storybook, E2E testing, performance, or design-to-code."
---

# GSD Frontend Skill Routing

Use this skill when browser-facing frontend or UI work needs frontend design guidance during planning, implementation, summary, or verification.

## Source root

The frontend/UI skill source root is:

`skills/frontend-ui-design-skills-copy/`

Treat that directory as reference guidance. Do not treat it as decorative context, and do not rewrite copied frontend skills when routing to them.

## Progressive disclosure workflow

1. Identify the frontend work type.
2. Use `references/routing-matrix.md` to select applicable copied skills.
3. Read the selected copied `SKILL.md` files before planning or implementing that work.
4. Read rule or reference files from the selected copied skill only when its `SKILL.md` points to them and the task needs that detail.
5. Do not read every copied frontend skill for every task.
6. Do not claim a skill was applied unless its guidance affected the plan, implementation, or verification expectation.

## Always consider for browser-facing UI

For UI/design changes, always check whether these apply:

- `skills/frontend-ui-design-skills-copy/accessibility/SKILL.md`
- `skills/frontend-ui-design-skills-copy/responsive-patterns/SKILL.md`
- `skills/frontend-ui-design-skills-copy/ui-components/SKILL.md`
- `skills/frontend-ui-design-skills-copy/interaction-patterns/SKILL.md`
- `skills/frontend-ui-design-skills-copy/testing-e2e/SKILL.md`

## Planning and execution integration

Read `references/planning-execution-integration.md` when writing plans, executing plans, summaries, or verification outputs for browser-facing frontend work.

That reference defines the planning pre-check, execution application rule, combined frontend skill routing record, and browser evidence record.

## Routing record

Use this compact record in planning, summaries, or verification when frontend/UI skills are relevant:

| Work Type | Skills considered | Skills applied | Skipped with reason | Evidence expectation |
|-----------|-------------------|----------------|---------------------|----------------------|
| `<frontend work type>` | `<skill names/paths considered>` | `<skill names/paths read and applied>` | `<not-applicable skills + reason>` | `<browser/design/test evidence expected>` |

Phase 3 defines this routing record. Phase 4 wires it into GSD planning, execution, summary, and verification guidance.

## Detailed matrix

Read `references/routing-matrix.md` for the work-type to skill-path matrix.

## Boundaries

- Use `skills/gsd-browser-automation/SKILL.md` to operate GSD Browser.
- Use `skills/gsd-browser-evidence-verification/SKILL.md` to report browser evidence.
- Use this skill to decide which copied frontend/UI skills to read and apply.
- Do not replace the Phase 1 GSD Browser skills with copied browser/dev-loop skills.
