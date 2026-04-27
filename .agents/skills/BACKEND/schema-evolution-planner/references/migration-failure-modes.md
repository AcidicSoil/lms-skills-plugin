# Migration Failure Modes

Use this catalog during `review`, `backfill`, and `cutover` work to pressure-test
the plan before any destructive step.

## Compatibility Failures

| Failure Mode | Symptom | Likely Cause | Mitigation |
|--------------|---------|--------------|------------|
| Hidden old reader | A background job or downstream consumer breaks after cutover | Consumer inventory missed a non-primary reader | Build a consumer checklist and require evidence before read cutover |
| Hidden old writer | Old field keeps changing after backfill is declared complete | Dual-write or legacy writer still active | Keep drift checks running until all writers are removed |
| Premature contract | Deploy succeeds, then requests fail or data disappears | Old schema removed before compatibility window closed | Make contract contingent on explicit proof, not calendar time |

## Backfill Failures

| Failure Mode | Symptom | Likely Cause | Mitigation |
|--------------|---------|--------------|------------|
| Non-idempotent backfill | Reruns create duplicate or corrupted results | Write logic is append-only or lacks deterministic overwrite behavior | Use deterministic upserts or guarded updates and define replay rules |
| Chunk-boundary drift | Counts mismatch between source and target | Pagination key unstable or source mutates while scanning | Use durable chunk keys, checkpointing, and reconciliation after each batch |
| Dual-write drift | Old and new representations diverge while backfill runs | Writes only update one side or apply different transforms | Add parity checks and clear dual-write invariants |
| Retry amplification | Failed batches create spikes or lock pressure | Retries are too large or not bounded | Use chunk limits, backoff, and resumption checkpoints |

## Cutover Failures

| Failure Mode | Symptom | Likely Cause | Mitigation |
|--------------|---------|--------------|------------|
| Read cutover too early | New path serves incomplete or stale data | Backfill or validation incomplete | Gate read cutover on parity evidence and correctness checks |
| Write cutover without rollback point | New writes succeed but cannot safely revert | Old path disabled before new path proved stable | Keep an explicit rollback point and downgrade path |
| Abort criteria missing | Operators continue a bad cutover too long | Success checks defined, abort checks omitted | Define both advance and abort conditions up front |
| Coupled read/write switch | Large blast radius when one half fails | Read and write cutovers were unnecessarily bundled | Split read and write cutovers unless strong reason exists |

## Contract-Stage Failures

- Dropping a field while ad hoc scripts still reference it
- Enforcing a new constraint before cleanup jobs finish
- Removing shadow columns before reconciliation history is captured

Contract-stage mitigations:

1. Verify no live reads, writes, jobs, or reports still depend on the old shape.
2. Preserve migration evidence long enough for rollback analysis.
3. Make destructive DDL the last step, not the first sign of progress.

## Review Checklist

- What is the last safe rollback point with no data loss?
- What proves the compatibility window is still open or already closed?
- Which consumers can lag independently from the main application?
- How is backfill progress measured and reconciled?
- What exact signal forces abort during cutover?
