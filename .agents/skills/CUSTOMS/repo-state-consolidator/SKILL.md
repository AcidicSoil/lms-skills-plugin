---
name: repo-state-consolidator
description: "Consolidate stale repository state across memory files, docs, handoffs, and duplicate structures. WHEN: \"consolidate repo state\", \"sync memories\", \"archive stale handoffs\", \"deduplicate package directories\", \"update project docs\", \"clean stale TODOs\"."
license: MIT
metadata:
  version: "1.0.0"
---

# Repo State Consolidator

Use this skill when repo work has accumulated stale memories, handoffs, TODOs, duplicate modules, or conflicting docs and the user wants the current state reconciled.

## Workflow

1. **Load repo guidance** — Read local agent instructions, README, TODOs, plan docs, memory files, handoffs, manifests, tests, and CI scripts before editing.
2. **Inspect state safely** — Check `git status`; preserve staged and unstaged work unless repo evidence shows the change belongs to the consolidation slice.
3. **Classify records** — Mark each memory/doc/handoff as active, superseded, stale, contradicted, or archived. Use [the current-state template](templates/current-state.md) when creating a durable state record.
4. **Resolve duplicates** — Identify duplicate packages, modules, docs, or plans. Choose a canonical location only from repo evidence, then preserve compatibility shims unless removal is explicitly safe.
5. **Create a consolidation plan** — Record evidence-backed tasks, acceptance criteria, Unknowns, and verification gates before implementation.
6. **Implement narrowly** — Archive stale records, update active docs, remove contradictions, and keep public behavior stable.
7. **Verify** — Run targeted checks for touched code/docs plus repo-native policy/full gates where available. Follow [the consolidation protocol](references/consolidation-protocol.md).
8. **Close out** — Report files moved/changed, canonical decisions, Unknowns, commands run, observed results, and the next safe slice.

## Guardrails

- Do not delete stale state if archive is safer.
- Do not invent canonical package direction without repo evidence.
- Do not remove compatibility imports unless tests and deprecation evidence support it.
- Do not claim docs, tests, or state are synced without checking current files.
- If unsure, mark `Unknown`, preserve behavior, and continue with safe consolidation.
