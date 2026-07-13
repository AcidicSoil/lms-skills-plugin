# Planning, Execution, Summary, and Verification Integration

Use this reference when planning, implementing, summarizing, or verifying browser-facing frontend/UI work.

This reference connects three local skills without merging their responsibilities:

- `skills/gsd-frontend-skill-routing/SKILL.md` selects and records applicable frontend/UI skills.
- `skills/gsd-browser-automation/SKILL.md` operates GSD Browser and captures artifacts.
- `skills/gsd-browser-evidence-verification/SKILL.md` defines completion evidence and result wording.

## Planning pre-check

Before decomposing browser-facing work into tasks, answer and record. This before decomposing check must happen before task breakdown:

1. **Browser-facing?** Does the work affect UI, frontend behavior, browser routes, forms, navigation, layout, visible states, or frontend/backend interaction observable in a browser?
2. **Frontend work type:** Which work type from `routing-matrix.md` applies?
3. **Skills considered:** Which copied frontend/UI skills might apply?
4. **Skills selected:** Which selected copied `SKILL.md` files were read or must be read before implementation?
5. **Skipped with reason:** Which likely skills are intentionally not applicable, and why?
6. **Evidence expectation:** What browser/design/test evidence will prove the work?

If the work is browser-facing but no frontend/UI skill applies, record the skipped reason instead of omitting the routing record.

### Planning record

| Work Type | Skills considered | Skills applied | Skipped with reason | Evidence expectation |
|-----------|-------------------|----------------|---------------------|----------------------|
| `<browser-facing frontend work type>` | `<copied skill paths considered>` | `<selected copied SKILL.md paths to read before implementation>` | `<skill/category + reason>` | `<browser/design/test evidence expected>` |

## Execution application rule

During implementation:

1. Read the selected copied frontend/UI `SKILL.md` files before making the matching implementation changes.
2. Apply the selected skill guidance where relevant.
3. If a selected skill does not apply after implementation details become clear, record it as `Skipped with reason` or as a deviation in the summary.
4. Do not claim a skill was applied unless it influenced the implementation, verification expectation, or final summary.
5. Pair frontend skill usage with GSD Browser operation and evidence skills for browser-facing work.

### Execution record

| Work Type | Skills considered | Skills applied | Skipped with reason | Evidence expectation |
|-----------|-------------------|----------------|---------------------|----------------------|
| `<actual work type>` | `<skills considered during planning/execution>` | `<skills read and applied>` | `<not used + reason>` | `<actual expected evidence>` |

## Summary and verification block

Use this block in summaries and verification outputs for browser-facing frontend/UI work.

### Frontend Skill Routing Record

| Work Type | Skills considered | Skills applied | Skipped with reason | Evidence expectation |
|-----------|-------------------|----------------|---------------------|----------------------|
| `<work type>` | `<copied skill paths considered>` | `<copied skill paths read/applied>` | `<none or reason>` | `<browser/design/test evidence expected>` |

### Browser Evidence Record

| Browser Session | Route/Page | Action Path | Screenshot Path | Additional Artifacts | Expected Result | Actual Result | Pass/Fail | Gaps |
|-----------------|------------|-------------|-----------------|----------------------|-----------------|---------------|-----------|------|
| `<session>` | `<route-or-url>` | `<actions taken>` | `.planning/browser-artifacts/<file>.png` | `<none-or-path>` | `<expected observable result>` | `<actual observed result>` | `<PASS|FAIL|BLOCKED>` | `<none-or-limitations>` |

## Completion rules

- Browser-facing work is not browser-verified until the changed route or flow is exercised in GSD Browser and the intended result is observed.
- Every browser-facing verification requires a screenshot.
- Visual/frontend design work must be inspected in browser for correctness; do not accept uninspected AI-generated UI or visually wrong output as complete.
- If GSD Browser is unavailable, use `Implemented, verification blocked`, list known gaps, and do not claim browser-verified completion.
- Fallback checks such as builds, lint, static tests, or server checks can support confidence, but they do not clear blocked browser verification.

## Scope reminders

- Do not modify `skills/frontend-ui-design-skills-copy/` when using this integration guidance.
- Do not read every copied frontend skill for every task.
- Do not replace GSD Browser automation/evidence skills with copied browser/dev-loop skills.
- Setup distribution, modes, memories, and regression proof are later-phase responsibilities.
