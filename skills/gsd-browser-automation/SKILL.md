---
name: gsd-browser-automation
description: "Use when browser-facing GSD work requires navigation, snapshots, screenshots, session reuse, or GSD Browser CLI/MCP operation."
---

# GSD Browser Automation

Use this skill whenever work touches browser-facing UI, routes, forms, navigation, layout, client-side behavior, frontend/backend interaction observable in a browser, or any frontend user flow.

## Activation scope

Activate this skill for GSD Browser sessions, navigation, snapshots, screenshots, stale refs, live viewer use, or browser-facing route and flow checks.

Browser-facing work includes anything design-related, UI/frontend work, browser-related behavior, and functional user-flow checks such as buttons, forms, navigation, modals, menus, visible states, and frontend/backend/server interaction that can be exercised in a browser.

Docs, setup, and config changes require GSD Browser only when they affect a rendered page, browser flow, local server, frontend/backend interaction, or UI-facing behavior.

## Concern boundary

GSD Core owns the plan, task scope, completion criteria, and `.planning/` state. GSD Browser owns browser automation and browser evidence capture.

Use `skills/gsd-browser-evidence-verification/SKILL.md` for completion evidence fields and reporting wording. Use `skills/opengsd-docs-lookup/SKILL.md` when you need OpenGSD, GSD Core, or GSD Browser reference details before operating the browser.

## Before operating GSD Browser

Read the relevant GSD Browser instructions or docs first. Use `skills/opengsd-docs-lookup/SKILL.md` to query local docs when the task needs reference details about snapshots, refs, CLI commands, live viewer, recording, or evidence capture.

## Cross-skill routing

- Use this skill to operate GSD Browser.
- Use `skills/gsd-browser-evidence-verification/SKILL.md` to decide whether the browser evidence is sufficient.
- Use `skills/gsd-frontend-skill-routing/SKILL.md` to select and record applicable frontend/UI skills before planning or implementing browser-facing frontend work.
- Use `skills/opengsd-docs-lookup/SKILL.md` to look up GSD Browser reference details before operating unfamiliar commands.

## Access path

Use GSD Browser MCP tools only when the current runtime exposes them.

In Serena/ChatGPT hosts, MCP browser tools are not exposed. Treat the `gsd-browser` CLI as the normal access path for this host.

## Artifact hygiene and portable paths

Use repo-relative browser artifact paths. The default browser evidence directory is `.planning/browser-artifacts/` from the repository root.

Run GSD Browser commands from the repository root when possible. If a command needs an absolute path internally, resolve the current repository root first instead of hard-coding a machine-specific absolute path in reusable guidance.

Screenshots may be committed intentionally when they are useful review or verification evidence. Heavy or debug-oriented browser output such as traces, HAR files, recordings, debug bundles, logs, caches, and dumps is local-only by default and should stay covered by `.gitignore` unless a plan explicitly says otherwise.

## CLI pattern for this host

Use a named session per phase, quick task, or verification pass:

```bash
SESSION="phase-or-task-name"

mkdir -p .planning/browser-artifacts

gsd-browser --session "$SESSION" navigate http://localhost:3000
gsd-browser --session "$SESSION" snapshot
gsd-browser --session "$SESSION" screenshot \
  --output ".planning/browser-artifacts/${SESSION}.png" \
  --format png
```

For human oversight, open the live viewer for the same session:

```bash
gsd-browser --session "$SESSION" view
```

## Session discipline

This is not a strict one-browser rule. If the work only needs one browser/session, open only one named session and keep reusing it.

Do not open unnecessary duplicate browser windows. If a separate browser context is genuinely needed, prefer a separate tab over a separate window and document why the extra context was needed.

When reporting evidence, include the session name and any legitimate additional browser context with its reason and relationship to the primary session.

## Browser work checklist

For every browser-facing change:

1. Start or reuse a named GSD Browser session.
2. Navigate to the affected route or user flow.
3. Take a fresh snapshot after navigation, reload, form submit, modal change, menu open/close, or other major DOM change.
4. Exercise the changed behavior.
5. Capture browser evidence under `.planning/browser-artifacts/`.
6. Report the session name, route, action path, and artifact path in the GSD summary or verification output.
7. For browser-facing frontend/UI work, include the frontend skill routing record from `skills/gsd-frontend-skill-routing/SKILL.md`.

## Stale state rule

If an interaction target or ref is stale, do not retry the same stale target. Take a fresh snapshot in the active session and continue from the new browser state instead of opening a duplicate window.

## Completion rule

Browser automation is not enough by itself. Use `skills/gsd-browser-evidence-verification/SKILL.md` to prove the acted-upon thing actually worked and, for frontend design work, that the resulting UI looks right rather than being accepted as uninspected AI output.
