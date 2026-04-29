# Output Templates

Use these templates to keep plans concrete and comparable across modes.

## Plan Template

```markdown
### Change Summary
- change type:
- current truth:
- target truth:
- compatibility window:

### Phase Plan
1. Expand:
2. Compatibility deploys:
3. Backfill:
4. Validation gates:
5. Cutover:
6. Contract:

### Invariants
- invariant:
- invariant:

### Rollback Point
- last safe rollback point:
- evidence required to advance:
```

## Review Template

```markdown
### Review Verdict
- overall risk:
- strongest part:
- main blocker:

### Findings
1. [severity] issue
2. [severity] issue

### Missing Evidence
- evidence gap:
- evidence gap:

### Recommendation
- proceed / revise / stop
```

## Backfill Template

```markdown
### Backfill Scope
- source of truth:
- target rows:
- chunk key:

### Execution Strategy
- write behavior:
- checkpointing:
- retry policy:
- reconciliation checks:

### Safety Rules
- idempotence rule:
- drift check:
- rollback handling:
```

## Cutover Template

```markdown
### Cutover Shape
- read cutover:
- write cutover:
- coupled or separate:

### Advance Criteria
- criterion:
- criterion:

### Abort Criteria
- criterion:
- criterion:

### Rollback
- rollback point:
- rollback action:
```

## Deprecate Template

```markdown
### Dependency Proof
- old writes removed:
- old reads removed:
- lagging consumers checked:

### Removal Order
1. remove writes
2. remove reads
3. drop schema

### Evidence Archive
- compatibility window closed by:
- final proof:
```
