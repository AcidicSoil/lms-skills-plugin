# Workflow

Run this procedure in order.

## 1. Register Sources

Assign stable `doc_id` values in received order: `DOC-01`, `DOC-02`, etc. For each source, record title if present, type guess (`PRD`, `ticket`, `notes`, `spec`, or `unknown`), and evident scope focus. If a prior master plan is supplied, label it `MASTER-PREV`.

## 2. Extract Atomic Statements

An atomic statement is one discrete, trackable item: requirement, feature, constraint, metric, risk, decision, milestone, module boundary, artifact, or workflow step.

Use adaptive parsing:

| Source shape | Extraction rule |
|---|---|
| Headings | Use heading path as `section_ref`. |
| Ticket-like blocks | Extract Title, Summary, Scope, Requirements, Acceptance Criteria, Risks, Dependencies. |
| Tables | Treat each row as a candidate item. |
| Code blocks | Extract only explicit normative statements: must, shall, exactly, required. |

Each item must include `item_id`, `item_type`, single-sentence statement, optional source-grounded details, and `sources` with `{doc_id, section_ref, optional_quote}`. Keep `optional_quote` to 20 words or fewer.

## 3. Deduplicate and Preserve Differences

Deduplicate by meaning, not wording. Equivalent statements become one canonical item with variants noted in details and provenance preserved. Similar but materially different statements remain separate.

## 4. Classify Relationships

Classify each item status and relationships using the ID and status rules. Add `conflicts_with`, `supersedes`, and `depends_on` only when explicitly supported.

## 5. Build Master Plan

If `prior_am` exists, keep structure and item IDs stable; make only necessary edits and record them in Change Log. If no prior exists, use the canonical outline from the output contract exactly.

Place each item in the best matching canonical section. For conflicts or variants, preserve options and add `Decision Needed` or `Proposed Path`.

## 6. Build Merge Ledger

List every atomic item with status, provenance, and convergence action. Add Top Deltas for the most important new, conflict, or variant items introduced by the latest artifacts.
