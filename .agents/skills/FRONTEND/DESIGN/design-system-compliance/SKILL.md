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
