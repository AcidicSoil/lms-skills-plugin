# Sample Rollout Sequences

These are reference sequences. Adapt the order only when the system or consumer
topology proves a safer alternative.

## 1. Column Rename with Shadow Column

Use for: `users.username -> users.handle`

1. Expand: add `handle` nullable beside `username`.
2. Deploy compatibility code: writes update both fields; reads still prefer `username`.
3. Backfill: copy historic `username` values into `handle` in idempotent chunks.
4. Validate: confirm parity between `username` and `handle`; confirm all writers dual-write.
5. Write cutover: new code writes only `handle` while still backfilling/reading compatibly if needed.
6. Read cutover: consumers switch to `handle`.
7. Contract: remove old reads, then old writes, then drop `username`.

## 2. Add Required Foreign Key

Use for: adding `account_id` to `invoices`

1. Expand: add nullable `account_id`.
2. Deploy compatibility code that can operate with null `account_id`.
3. Backfill existing invoices with deterministic mapping logic.
4. Validate: no unresolved records, no broken references, no new nulls from current writes.
5. Enable dual-write or strict write-path population for new records.
6. Cut over dependent readers or workflows to rely on `account_id`.
7. Contract: enforce `NOT NULL` and the foreign key only after violation count is zero.

## 3. Split Table into Normalized Structure

Use for: moving address fields from `customers` to `customer_addresses`

1. Expand: create target table and compatibility access layer.
2. Deploy dual-write so new writes populate both old and new structures.
3. Backfill historical rows into the target table with checkpoints.
4. Validate row counts, joins, dedupe rules, and referential integrity.
5. Read cutover by consumer group or endpoint.
6. Stop old writes once all writers use the new structure.
7. Contract: remove old reads, then old columns, after evidence is complete.

## 4. Constraint Hardening

Use for: making a nullable field non-null or enforcing a uniqueness rule

1. Measure current violations.
2. Fix or quarantine bad rows.
3. Deploy writes that already conform to the target rule.
4. Re-measure until violation count reaches zero and stays there.
5. Enforce the constraint.
6. Keep rollback steps documented if enforcement causes unexpected failures.

## Cutover Checklist

- Success conditions are explicit and measurable.
- Abort conditions are explicit and measurable.
- Rollback point exists and is still reachable.
- Consumer inventory is current.
- Backfill parity evidence exists.
- Contract step is deferred until after stable post-cutover validation.
