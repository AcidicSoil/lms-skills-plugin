# Output Formats

Use these templates to keep `simplify` outputs short, concrete, and behavior-focused.

## Analyze

```md
**Scope**
- <target and why it was selected>

**Top opportunities**
| ID | Category | Confidence | Why it is complex | Safer simpler move |
|----|----------|------------|-------------------|--------------------|
| A1 | <category> | high/med/low | <one sentence> | <one sentence> |

**Do not change**
- <behavior, contract, or boundary that must stay intact>

**Recommended next step**
- Apply the high-confidence items only / Ask before touching <risky area>
```

## Apply

```md
**Scope**
- <target and recent-scope note>

**Changes made**
- <edit 1>
- <edit 2>

**Before / After** *(recommended for non-trivial edits)*
- Before: <old shape, snippet, or structural summary>
- After: <new shape, snippet, or structural summary>

**Why this is simpler**
- <clarity/structure rationale>

**Behavior preservation basis**
- <tests/checks/reasoning used>

**Validation**
- Ran: <existing checks>
- Not run: <anything unavailable or blocked>

**Deferred**
- <risky items intentionally left untouched>
```

## Explain

```md
**Why it feels complex**
- <specific source of complexity>

**Safer simpler shape**
- <what would change structurally>

**Keep the same**
- <behavior or contract that must remain>

**Recommended move**
- Analyze first / Apply a narrow pass / Ask before crossing boundaries
```

## Empty Arguments

```md
Choose a mode:
- `analyze <path, symbol, or snippet>` - read-only simplification report
- `apply <path, symbol, or snippet>` - behavior-preserving simplification pass
- `explain <path, symbol, or snippet>` - explanation without edits

Paste code, name a file or symbol, or ask "Simplify this code".
```

## Redirection

Use a short refusal + redirect:

```md
This is outside `simplify` scope because <reason>.
Use `<skill-name>` instead: <why that skill fits>.
```

Common redirects:

- correctness or hidden bugs -> `honest-review`
- debt inventory / prioritization -> `tech-debt-analyzer`
- profiling / perf-only tuning -> `performance-profiler`
- security-focused review -> `security-scanner`
