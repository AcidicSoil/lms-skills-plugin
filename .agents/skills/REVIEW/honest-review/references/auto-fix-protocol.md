# Auto-Fix Protocol

Orchestration-first fix workflow: conflict pre-check, dry-run preview, user approval, parallel Pattern E dispatch, rollback safety, verification.
Read when user selects "implement fixes" after a review report.

## Contents

- [Fix Execution Workflow (Pattern E)](#fix-execution-workflow-pattern-e)
  - [Step 1: Conflict Pre-Check](#step-1-conflict-pre-check)
  - [Step 2: Dry-Run Preview](#step-2-dry-run-preview)
  - [Step 3: Orchestration Plan](#step-3-orchestration-plan)
  - [Step 4: Dispatch](#step-4-dispatch)
  - [Step 5: Rollback Safety](#step-5-rollback-safety)
  - [Step 6: Post-Fix Verification](#step-6-post-fix-verification)

## Fix Execution Workflow (Pattern E)

### Step 1: Conflict Pre-Check

Before dispatching, identify which findings touch the same file:

1. **Group by file**: Collect the set of files touched by each approved finding.
2. **Same-file batches**: Findings that edit the same file form a sequential batch — they must be applied by a single subagent in line-number ascending order to avoid merge conflicts.
3. **Cross-file independence**: Findings touching distinct files are fully independent and can be dispatched in parallel.
4. **Conflict types to flag** (flag before proceeding to Step 2):
   - **Overlapping edits**: Two fixes modify the same lines in the same file. Flag and ask user to choose one or manually merge.
   - **Dependent edits**: Fix A changes a function signature that fix B calls. Flag the dependency and note required application order within the batch.
   - **Cascading effects**: Fix A removes a function that fix B modifies. Flag and recommend applying only A.

```text
CONFLICT PRE-CHECK:
  HR-S-003 and HR-S-007 both modify src/api/users.py:45-52
  → Grouped into same-file sequential batch. Choose resolution: [HR-S-003 / HR-S-007 / merge / skip both]

  HR-S-001 (src/auth.py), HR-S-005 (src/models/user.py) — independent, parallel-eligible.
```

### Step 2: Dry-Run Preview

After conflict resolution, generate a unified diff preview for each fix group (do not write to disk):

1. For each finding (or same-file batch), generate the fix as a unified diff.
2. Present all diffs grouped by file, ordered by line number ascending.
3. Annotate each diff with: finding ID, confidence, effort estimate.

```text
FIX PREVIEW — HR-S-001 [P0, Confidence: 0.85, Effort: S]
--- a/src/auth.py
+++ b/src/auth.py
@@ -43,4 +43,7 @@
     token = request.headers.get("Authorization")
+    if token_expired(token):
+        raise TokenExpiredError("Token has expired")
+
     user = lookup_user(token)
```

For same-file sequential batches, present all diffs in the batch under a shared batch header.

**Approval gate (Rule 8 / Rule 17 — mandatory):** After presenting all previews, ask the user for approval:

```text
Implement fixes? Choose one:
  [all]     — apply all N fixes
  [select]  — choose individual fixes by ID (e.g., "HR-S-001, HR-S-003")
  [skip]    — do not implement any fixes
  [edit]    — modify a fix before applying (provide finding ID)
```

**Rules:**

- Never apply fixes without explicit user approval.
- If user selects "edit", present the specific diff and accept modifications before proceeding.
- If user selects "select", apply only the chosen finding IDs.

### Step 3: Orchestration Plan

After user approves, generate a Pattern E plan (TeamCreate + nested subagent waves):

1. **One subagent per independent fix** or **one subagent per same-file sequential batch**.
2. **Create TaskList entries** for every subagent task before dispatch. Each task must include:
   - Finding ID(s) in scope
   - Target file(s)
   - Acceptance criteria (e.g., "diff matches preview, lint clean, no new test failures")
   - `activeForm` in present continuous tense (e.g., "Applying HR-S-001 to src/auth.py")
3. Present the orchestration plan to confirm the subagent breakdown is correct before dispatch.

```text
ORCHESTRATION PLAN (Pattern E):
  Subagent A — HR-S-001 → src/auth.py           [independent]
  Subagent B — HR-S-005 → src/models/user.py    [independent]
  Subagent C — HR-S-003, HR-S-007 → src/api/users.py  [same-file batch, sequential within subagent]
```

### Step 4: Dispatch

Run all independent subagent groups in parallel:

- Dispatch all independent subagents in a single message (one Task call per subagent).
- No token budget caps — scale to however many subagents are needed.
- Each subagent receives a self-contained prompt with: exact file path(s), the approved diff, acceptance criteria, and rollback instructions (Step 5).
- Apply the Accounting Rule after all subagents return: N dispatched = N resolved. Do not advance until every subagent reports SUCCESS or explicit SKIP.

### Step 5: Rollback Safety

Each subagent must checkpoint before editing:

1. **Check git state**: run `git status --porcelain`. If uncommitted changes exist in the target file(s), warn and stash or commit first.
2. **Create checkpoint**: run `git stash push -m "honest-review-pre-fix-<finding-id>"` or note the unstaged state before any edit.
3. **Apply atomically within the subagent**: apply the approved fix, then verify it matches the preview diff.
4. **On failure**: if the fix fails to apply cleanly, the subagent rolls back its own changes (`git checkout -- <file>`) and reports failure back to the lead without committing. The lead collects partial results and reports which fixes succeeded and which failed.
5. **Lead commit**: after all subagents complete successfully, the lead commits all changes as a single commit: `fix: apply honest-review findings [HR-S-001, HR-S-003, ...]`.

### Step 6: Post-Fix Verification

After all tasks complete, run verification and report:

1. **Build/lint**: run project build and linter. Report any new errors introduced.
2. **Tests**: run test suite. Report any new failures.
3. **Behavior spot-check**: describe what to manually verify (if applicable).
4. **Re-scan**: optionally re-run the review on fixed files to confirm findings are resolved.
5. **Report**: summarize fixed findings, any still-open findings, and any regressions introduced.

```text
VERIFIED:
  Build/lint: clean ✓
  Tests: 42 passed, 0 failed ✓
  Behavior: token expiry now returns 401 ✓
  Fixed:    HR-S-001 ✓, HR-S-003 ✓, HR-S-005 ✓
  Open:     HR-S-007 (skipped by user)
  Regressions: none ✓
```

For single-finding fixes, Pattern E with one subagent is equivalent to the former sequential flow — no behavioral difference for simple cases.

Cross-references: references/output-formats.md (fix preview format), SKILL.md (approval gate rule).
