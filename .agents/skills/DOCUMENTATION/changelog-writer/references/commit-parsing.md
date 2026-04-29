# Commit Parsing Rules

Reference for conventional commit parsing, breaking change detection heuristics, and edge case handling.

## Contents

1. [Conventional Commits Syntax](#conventional-commits-syntax)
2. [Breaking Change Detection](#breaking-change-detection)
3. [Heuristic Classification](#heuristic-classification)
4. [Edge Cases](#edge-cases)

---

## Conventional Commits Syntax

Format: `type(scope): description`

### Recognized Types

| Type | Meaning | Changelog Section |
|------|---------|-------------------|
| `feat` | New feature | Added |
| `fix` | Bug fix | Fixed |
| `refactor` | Code restructuring | Changed |
| `perf` | Performance improvement | Changed |
| `docs` | Documentation only | Changed |
| `chore` | Maintenance, deps | Changed |
| `test` | Adding/fixing tests | Changed |
| `ci` | CI/CD changes | Changed |
| `build` | Build system changes | Changed |
| `style` | Formatting, whitespace | Changed |
| `revert` | Reverting a commit | Removed |

### Breaking Change Markers

1. `!` after type/scope: `feat(api)!: remove deprecated endpoint`
2. `BREAKING CHANGE:` footer in commit body
3. `BREAKING-CHANGE:` footer (hyphenated variant)

### Scope Rules

- Scope is optional: `feat: add login` is valid
- Scope is a single word or kebab-case: `feat(user-auth): ...`
- Multiple scopes not supported in standard format
- Empty parentheses `feat(): ...` treated as no scope

---

## Breaking Change Detection

### Explicit Signals (high confidence)

- `!` marker in conventional commit type
- `BREAKING CHANGE:` or `BREAKING-CHANGE:` footer
- Commit subject contains "BREAKING"

### Heuristic Signals (medium confidence)

Flag these for human review — may or may not be breaking:

| Signal | Example | Why It Might Break |
|--------|---------|-------------------|
| "remove" + API/function name | "remove getUser endpoint" | Consumers lose access |
| "rename" + public symbol | "rename Config to Settings" | Import paths change |
| "drop" + support/feature | "drop Python 3.8 support" | Users on old versions affected |
| "change" + default/behavior | "change default timeout" | Existing behavior shifts |
| "incompatible" anywhere | "incompatible schema change" | Explicit signal |
| "migrate" in imperative | "migrate to new auth" | Implies required action |

### Language-Specific Patterns

Loaded from `data/breaking-change-patterns.json`. Key patterns:

**Python:**
- Removed `__init__.py` exports
- Changed function signatures (required params added)
- Moved modules between packages

**JavaScript/TypeScript:**
- Changed named exports
- Modified default export
- Changed `package.json` `main`/`exports` fields

**General:**
- Changed environment variable names
- Modified config file schema
- Changed CLI flag names or behavior
- Database schema changes (column removal/rename)

---

## Heuristic Classification

When commits do not follow conventional format, classify by keyword matching.

### Priority Order

Check keywords in this order (first match wins):

1. `revert` → revert
2. `fix`, `resolve`, `correct`, `patch` → fix
3. `feat`, `add`, `implement`, `introduce`, `support` → feat
4. `refactor`, `restructure`, `simplify`, `clean` → refactor
5. `perf`, `optimize`, `speed`, `cache` → perf
6. `test`, `spec`, `coverage` → test
7. `doc`, `readme`, `comment` → docs
8. `ci`, `pipeline`, `workflow`, `deploy` → ci
9. `build`, `compile`, `bundle` → build
10. `format`, `lint`, `whitespace` → style
11. Everything else → chore

### Confidence Markers

When using heuristic classification, the commit is marked as `"conventional": false` in the output. The agent should:

- Flag these to the user as best-effort classifications
- Allow the user to override
- Not use these for automated version bump decisions without confirmation

---

## Edge Cases

| Case | Handling |
|------|----------|
| Merge commits | Skip — they duplicate information from merged commits |
| Squash commits | Parse the squash message body for individual commit messages |
| Empty commit messages | Skip with warning to stderr |
| Non-English commits | Classify as `chore`, flag for human review |
| Commits with multiple types | Use the first recognized type |
| Very long descriptions | Truncate at 200 chars for changelog entry |
| Commits referencing issues | Preserve issue references: `(#123)`, `(GH-456)` |
