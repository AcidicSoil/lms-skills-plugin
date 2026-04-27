---
name: schema-evolution-planner
description: >-
  Plan zero-downtime schema changes across code, data backfills, and cutovers.
  Use for expand-contract database changes. NOT for fresh schema design or DBA
  ops.
argument-hint: "<mode> [change]"
license: MIT
metadata:
  author: wyattowalsh
  version: "1.0"
---

# Schema Evolution Planner

Plan safe, staged database schema changes across application code, backfills,
and cutovers.

**Scope:** Expand-contract and compatibility planning for live systems. NOT for
greenfield schema design (database-architect) or DBA operations.

## Canonical Vocabulary

| Term | Definition |
|------|------------|
| **expand** | Additive schema change compatible with existing code |
| **backfill** | Data migration that populates new structures from old data |
| **dual-write** | Temporarily writing old and new representations |
| **dual-read** | Temporarily reading from both old and new representations |
| **cutover** | The point where traffic or logic switches to the new path |
| **contract** | Removal of deprecated schema after compatibility window closes |
| **compatibility window** | Period where old and new code must both work |
| **invariant** | Condition that must remain true during migration |
| **shadow column** | New field added beside the old field during migration |
| **rollback point** | Last safe state that can be restored without data loss |

## Dispatch

| $ARGUMENTS | Mode |
|------------|------|
| `plan <change>` | Build the full migration sequence |
| `review <migration or rollout>` | Audit an existing evolution plan |
| `backfill <change>` | Design the data backfill strategy |
| `cutover <change>` | Plan read or write switchover |
| `deprecate <change>` | Plan the contract and removal stage |
| Natural language about zero-downtime schema changes | Auto-detect the closest mode |
| Empty | Show the mode menu with examples |

## Mode Menu

| # | Mode | Example |
|---|------|---------|
| 1 | Plan | `plan rename users.username to handle` |
| 2 | Review | `review migration plan for orders status enum change` |
| 3 | Backfill | `backfill new account_id on invoices` |
| 4 | Cutover | `cutover reads to new customer_profile table` |
| 5 | Deprecate | `deprecate legacy address columns` |

## When to Use

- Renaming columns or tables in a live system
- Splitting or merging tables without downtime
- Adding required fields to existing tables
- Introducing new identifiers or foreign keys gradually
- Coordinating schema changes with multiple application deploys

## Classification Logic

Use this as the classification gate before choosing a mode:

1. If the task is fresh schema design, data modeling, or table design from scratch, route to `database-architect`.
2. If the task is query tuning, index tuning, vacuuming, replication, or database administration, do not use this skill.
3. If the task is release orchestration, artifact promotion, or rollout topology beyond schema sequencing, route to `release-pipeline-architect`.
4. If the task is an application feature change with no compatibility window, use the application or framework skill instead.
5. If the prompt mixes rename-vs-redesign uncertainty, start in `plan` mode and explicitly decide whether the change is additive evolution or a broader redesign.

## Instructions

### Mode: Plan

1. Identify the current read paths, write paths, downstream consumers, and deployment order constraints.
2. Classify the change: rename, type change, split, merge, constraint hardening, or deletion.
3. Read `references/change-type-decision-matrix.md` to pick the safest expand-contract pattern for the change type.
4. Read `references/sample-rollout-sequences.md` if the change touches multiple deploys, readers, writers, or downstream consumers.
3. Write an expand-contract sequence with explicit checkpoints: expand, deploy compatibility code, backfill, validate invariants, cutover, then contract.
4. Define the compatibility window and what old and new code must tolerate during it.
5. Name the invariants that must be measured before moving to the next phase.
6. Present the plan using the relevant template from `references/output-templates.md`.

### Mode: Review

1. Read the migration plan, migration files, and any rollout notes.
2. Read `references/migration-failure-modes.md` and `references/change-type-decision-matrix.md`.
2. Check for hidden destructive steps, missing compatibility windows, or missing rollback points.
3. Flag assumptions about data quality, backfill runtime, and consumer readiness.
4. Rank findings by severity.
5. Present findings using the review template in `references/output-templates.md`.

### Mode: Backfill

1. Define the source of truth and target population logic.
2. Make the backfill idempotent and chunkable.
3. Read `references/migration-failure-modes.md` for duplicate-write, drift, and reconciliation hazards.
3. Specify batching strategy, retry behavior, progress tracking, and reconciliation checks.
4. Decide whether dual-write is required while the backfill runs.
5. Present the plan using the backfill template in `references/output-templates.md`.

### Mode: Cutover

1. Separate write cutover from read cutover when they do not need to happen together.
2. Define the exact success checks before switching traffic or logic.
3. Read `references/sample-rollout-sequences.md` and `references/migration-failure-modes.md` for abort and rollback patterns.
4. Keep a rollback point until the new path is proven stable.
5. Present the cutover checklist using `references/output-templates.md`.

### Mode: Deprecate

1. Verify no live code, jobs, or consumers still depend on the old structure.
2. Remove writes first, then reads, then the deprecated schema.
3. Record the evidence that the compatibility window is closed.
4. Present evidence and removal ordering using the deprecate template in `references/output-templates.md`.

## Output Requirements

- Every plan must include expand, compatibility, validation, cutover, and contract stages.
- State the invariants to check between stages.
- Name the rollback point and the evidence needed to advance.

## Critical Rules

1. Never remove or repurpose a live field before the compatibility window closes.
2. Every backfill must be idempotent and restartable.
3. Cutovers must define success and abort criteria in advance.
4. Destructive changes belong only in the contract stage.
5. If the change is really a fresh schema design problem, route it to database-architect.

## Scaling Strategy

| Complexity | Strategy |
|------------|----------|
| Small | Use a single additive compatibility path for simple renames, nullable adds, or shadow-column introductions. |
| Medium | Use explicit staged execution: expand, deploy compatibility logic, backfill in chunks, validate, cut over, then contract. |
| Large | Treat the change as a rollout program with separate read and write cutovers, evidence gates, and phased consumer movement. |

## Progressive Disclosure

- Read reference files as indicated by the active mode instead of loading everything at once.
- Load `references/change-type-decision-matrix.md` on demand for change classification and ambiguity handling.
- Load `references/migration-failure-modes.md` on demand for reviews, backfills, and cutovers.
- Load `references/sample-rollout-sequences.md` on demand for multi-phase execution planning.
- Load `references/output-templates.md` on demand when presenting the final response.

## Reference File Index

| File | Purpose | When to Read |
|------|---------|--------------|
| `references/change-type-decision-matrix.md` | Maps schema change types to safe evolution patterns, compatibility windows, and red flags | Any `plan` or `review` request |
| `references/migration-failure-modes.md` | Catalog of common rollout, backfill, and cutover failure modes with mitigations | `review`, `backfill`, or `cutover` work |
| `references/sample-rollout-sequences.md` | Reference expand-contract sequences for common migration shapes | Multi-phase `plan` or `cutover` work |
| `references/output-templates.md` | Standard response templates for plans, reviews, backfills, cutovers, and deprecations | Presenting final output in any mode |

## Scope Boundaries

**IS for:** zero-downtime renames, splits, merges, backfills, staged cutovers, compatibility sequencing.

**NOT for:** greenfield schema modeling, query tuning, or database administration.
