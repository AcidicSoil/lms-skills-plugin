# Changelog Conventions

Reference for changelog formats, release note style, migration guide structure, and semantic versioning decisions.

## Contents

1. [Keep a Changelog Format](#keep-a-changelog-format)
2. [Release Note Style](#release-note-style)
3. [Migration Guide Structure](#migration-guide-structure)
4. [Semantic Versioning Decision Tree](#semantic-versioning-decision-tree)

---

## Keep a Changelog Format

Based on [keepachangelog.com](https://keepachangelog.com/en/1.1.0/).

### Section Order

1. **Added** — new features (maps from `feat`)
2. **Changed** — changes in existing functionality (maps from `refactor`, `perf`, `docs`, `style`, `build`, `ci`, `chore`, `test`)
3. **Deprecated** — soon-to-be removed features
4. **Removed** — removed features (maps from `revert`, breaking removals)
5. **Fixed** — bug fixes (maps from `fix`)
6. **Security** — vulnerability fixes

### Formatting Rules

- Each version gets its own `## [version] - YYYY-MM-DD` heading
- Unreleased changes go under `## [Unreleased]`
- Entries are bullet points, one per line
- Scope prefix in bold: `- **api**: description`
- Breaking changes get a dedicated `### BREAKING CHANGES` subsection at the top
- Link version headings to diff comparisons when possible
- Most recent version first (reverse chronological)
- Date format: ISO 8601 (YYYY-MM-DD)

### Entry Writing

- Start with a verb in past tense or present perfect ("Added X", "Fixed Y")
- Describe the user impact, not the implementation
- Include issue/PR references where available: `(#123)`
- Group related changes into a single entry
- Remove noise: dependency bumps, formatting-only changes, CI tweaks (unless user-requested)

---

## Release Note Style

Release notes are user-facing. They differ from changelogs in tone and structure.

### Principles

1. **Audience is users, not developers** — avoid internal jargon
2. **Lead with impact** — what can the user do now that they couldn't before?
3. **Show, don't tell** — include code snippets for new features
4. **Be honest about breaking changes** — explain why and how to migrate
5. **Credit contributors** — list all contributors from git log

### Structure

```markdown
# v2.1.0

## Highlights

Brief narrative paragraph (2-3 sentences) summarizing the theme of this release.

### Feature Name
Description of what it does and why it matters.

```code example```

## Improvements
- Bullet list of enhancements

## Bug Fixes
- Bullet list of fixes with issue references

## Breaking Changes
- Each breaking change with migration link

## Contributors
Thanks to @name1, @name2 for their contributions.

## Full Changelog
Link to diff: v2.0.0...v2.1.0
```

### Tone

- Conversational but professional
- Active voice: "You can now..." not "It is now possible to..."
- Avoid superlatives: "improved" not "dramatically improved"
- Quantify when possible: "3x faster" not "much faster"

---

## Migration Guide Structure

Migration guides help users upgrade between versions.

### Template

```markdown
# Migration Guide: v1.x to v2.x

## Pre-Migration Checklist
- [ ] Backup your project
- [ ] Ensure test suite passes on current version
- [ ] Review breaking changes below

## Breaking Changes

### 1. [Change Name]
**What changed:** Description of old vs new behavior.
**Why:** Rationale for the change.
**Action required:**
1. Step one
2. Step two

**Before:**
```code```

**After:**
```code```

**Verification:** How to confirm migration worked.

### 2. [Next Change]
...

## Post-Migration Checklist
- [ ] Run test suite
- [ ] Verify key workflows
- [ ] Update CI/CD configuration if needed
```

### Ordering

Order migration steps by dependency:
1. Configuration changes first (they affect everything)
2. API changes (imports, function signatures)
3. Behavioral changes (same API, different behavior)
4. Deprecation removals (previously warned, now removed)

---

## Semantic Versioning Decision Tree

```
Has any public API been removed or changed incompatibly?
  YES → MAJOR bump
  NO ↓

Has new functionality been added in a backward-compatible way?
  YES → MINOR bump
  NO ↓

Are all changes backward-compatible bug fixes?
  YES → PATCH bump
  NO ↓

Are changes internal only (refactor, docs, tests, CI)?
  YES → PATCH bump (or skip release)
```

### Edge Cases

| Scenario | Bump | Rationale |
|----------|------|-----------|
| New optional parameter added | MINOR | Backward-compatible addition |
| Default value changed | MAJOR | Existing callers get different behavior |
| Error message text changed | PATCH | Not part of public API contract |
| New dependency added | MINOR | Users need to install it |
| Dependency version bumped (major) | Depends | MAJOR if it changes your public API |
| Performance improvement only | PATCH | No API change |
| Security fix | PATCH | Urgent, backward-compatible |
| Deprecation warning added | MINOR | New behavior (the warning) |
| Deprecated feature removed | MAJOR | Breaking for users of that feature |
