# Change-Type Decision Matrix

Use this matrix to decide whether the request is a true schema-evolution problem,
which expand-contract pattern fits it, and what evidence gates must exist before
moving forward.

| Change Type | Default Pattern | Compatibility Needs | Backfill Needs | Cutover Shape | Main Risk |
|-------------|-----------------|---------------------|----------------|---------------|-----------|
| Column rename | Add shadow column, dual-write, backfill, cut reads/writes, contract old column | Old and new code must tolerate both names during the compatibility window | Usually yes | Separate write and read cutovers if consumers move at different speeds | Silent drift between old and new names |
| Table rename | Introduce new table or view alias, dual-read or dual-write as needed, backfill if materialized move is required | Strong cross-service compatibility check | Often yes | Usually staged by consumer groups | Lagging readers still pointing at the old table |
| Type widening | Expand in place if safely compatible | Existing writers and readers must tolerate both ranges or formats | Usually no | Minimal cutover | Hidden downstream assumptions about old type |
| Type narrowing | Shadow column or staged validation before contract | Must reject bad legacy values before enforcing stricter type | Often yes | Contract only after data proves clean | Runtime failures during enforcement |
| Split table | Add new structures, dual-write, backfill, cut reads, then retire old table | Consumers need stable join or projection during transition | Yes | Read cutover often lags writes | Partial population and orphaned rows |
| Merge tables | Introduce target structure, map source identities, backfill, dual-write if sources stay live | Strong identity and dedupe rules required | Yes | Usually by consumer or workflow slice | Duplicate merges or broken identity mapping |
| Add required field | Add nullable field first, populate, enforce non-null later | Old writers must not fail during expand phase | Yes | Constraint hardening after validation | Premature enforcement |
| New foreign key | Add column, populate, validate references, then enforce constraint | Reads and writes must tolerate missing link during migration | Yes | Constraint enablement is the real cutover | Broken referential integrity |
| Constraint hardening | Measure violations first, fix data, then enforce | Application behavior must already conform before contract | Sometimes | Enforcement step is the cutover | Immediate production breakage |
| Delete field/table | Stop writes, stop reads, wait out compatibility window, then drop | Requires proof that no live code or jobs depend on it | No | Contract-only | Deleting a still-live dependency |

## Rename vs Redesign Triage

Use `plan` mode and answer these questions before choosing a pattern:

1. Is the target structure semantically the same entity with a safer name or shape?
2. Can old and new writes describe the same truth during a compatibility window?
3. Would downstream consumers need materially different data contracts?
4. Is the change introducing new domain meaning rather than reshaping the same one?

Interpretation:

- If the entity meaning is unchanged and old/new writes can coexist, prefer rename or split/merge evolution.
- If the target structure changes domain boundaries, ownership, or contract meaning, this is likely broader redesign work and may need `database-architect` before migration planning.

## Evidence Gates by Change Type

- Rename: parity checks between old and new columns or tables, consumer-readiness inventory, and drift alarms.
- Backfilled adds: progress tracking, reconciliation counts, and null-or-default residue checks.
- Constraint hardening: violation count must reach zero before enforcement.
- Split or merge: row-count parity, referential integrity, dedupe evidence, and consumer cutover confirmation.
