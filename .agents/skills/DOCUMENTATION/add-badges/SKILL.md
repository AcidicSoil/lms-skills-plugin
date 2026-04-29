---
name: add-badges
description: >-
  Detect stack and generate shields.io README badges with icons, colors, live
  endpoints. Use when adding or updating badges. NOT for README writing, docs,
  or CI/CD setup.
argument-hint: "[--profile active] [--include status,package] [--exclude social] [--style flat-square] [--layout centered] [--yes] [--replace] [--dry-run] [--readme PATH] [--dark-mode]"
license: MIT
metadata:
  author: wyattowalsh
  version: "1.0.0"
hooks:
  PreToolUse:
    - matcher: Edit
      hooks:
        - command: "git diff --quiet HEAD -- README.md 2>/dev/null || echo 'WARNING: README.md has uncommitted changes that may be overwritten'"
---

# Add Badges

Generate and update README badge blocks without drifting into general README editing.

## Dispatch

| $ARGUMENTS | Action |
|------------|--------|
| Empty | Show the empty/help gallery and ask for the target repo or README path |
| Flags or natural-language badge request | Run the full badge workflow: detect -> select -> present -> insert |
| `--dry-run` with any request | Run through preview only and stop before file edits |
| removal-only request | Skip detection, inspect the existing badge block, and present the reduced set |

## Empty/Help Gallery

When `$ARGUMENTS` is empty, show the main usage shape plus examples:

- `/add-badges --profile active --dry-run`
- `/add-badges --include status,package --readme README.md`
- `/add-badges --replace --yes`
- `/add-badges remove social badges`

State the main phases and the write boundary:

- Detect the repo and existing badge state
- Select badges and layout based on flags and detected signals
- Present the proposed block and diff indicators
- Insert only after approval, unless `--yes` was explicitly passed

## Progressive Disclosure

- Keep `SKILL.md` focused on routing, phase order, approval boundaries, and flag semantics.
- Read `references/badge-catalog-core.md` on every run.
- Read `references/badge-catalog-extended.md` only when non-basic signals are detected.
- Read `references/style-guide.md` only when layout, format-specific syntax, or dark-mode output matters.
- Use `scripts/detect.py` for repository detection and `scripts/validate-badges.py` only after insertion when verification is requested.

## Internal Phase 1 — Detect

Run the detection script via the Bash tool:

```
uv run python skills/add-badges/scripts/detect.py <path>
```

Parse the JSON output. The script detects: repo info, languages, package managers, frameworks, CI/CD, infrastructure, code quality, testing, docs, license, release, security, community, developer tooling, databases, monorepo signals, and existing badges.

If the script fails (uv unavailable, Python missing, script error, invalid JSON), fall back to manual detection:
- Glob for manifest files (pyproject.toml, package.json, go.mod, Cargo.toml, etc.)
- Read `.git/config` or run `git remote get-url origin` for owner/repo
- Glob `.github/workflows/*.yml` for CI badge candidates
- Read LICENSE first line for SPDX type
- Check for Dockerfile, .pre-commit-config.yaml, codecov.yml, etc.

## Internal Phase 2 — Select

Read `references/badge-catalog-core.md` (always). Read `references/badge-catalog-extended.md` when detection reports any non-basic signals (any of: frameworks, infrastructure, code_quality linters/formatters/type_checkers, docs, release, security, monorepo, databases, developer_tooling, community).

Read `references/style-guide.md` for layout, ordering, and URL conventions.

**Selection rules:**
- Prefer dynamic endpoints over static — never hardcode version numbers, coverage %, download counts
- Include `?logo={slug}&logoColor={white|black}` on every badge with a Simple Icons slug
- Match existing badge style if README already has badges (from `existing_badges.style`); default to `flat-square`
- If platform is GitLab or Bitbucket, use shields.io platform paths (`/gitlab/...`, `/bitbucket/...`)
- `--profile <name>`: preset badge selection by maturity. `new` (3-5 badges: status, license, language), `active` (8-12: core + quality, code-style, frameworks), `mature` (12-18: core + all extended except developer-tooling), `enterprise` (15-20: ALL 16 categories including OpenSSF). Overrides `--include`/`--exclude`. No profile = auto-select based on detected features
- Target 8-15 badges; group by display super-groups: Status > Quality > Package > Tech Stack > Social

**Display super-group → category mapping:**

| Super-group | Categories |
|---|---|
| Status | status |
| Quality | quality, code-style, security |
| Package | package, license |
| Tech Stack | language, frameworks, infrastructure, docs, release, databases, monorepo, developer-tooling |
| Social | social, community |
- Deduplicate against existing badges by comparing badge URL service/metric paths
- For CI status: prefer native badge URL (e.g., `github.com/{owner}/{repo}/actions/workflows/{file}/badge.svg`) — works for private repos. For repos with 5+ workflows, prioritize CI/test workflows; let user select others in Phase 3
- If `repo.visibility` is `"private"`, skip badges marked `requires: public-api` and warn user. Prefer native URLs for CI and direct service URLs for coverage
- If existing badges reference dead services (from `existing_badges.dead_services`), flag them and suggest catalog replacements
- Custom badge support: if user requests a badge not in the catalog (Discord server, sponsor, custom API), construct from shields.io static badge API or endpoint badge API (`/badge/dynamic/json?url=...&query=...`). Ask for required params
- If user requests forthebadge.com-style decorative badges, use forthebadge.com API. Note: forthebadge is decorative only — no dynamic data. For dynamic badges in large bold style, use shields.io `?style=for-the-badge`

**Flag handling:**
- `--include <categories>`: only generate badges from named categories (comma-separated). Category names: status, quality, package, license, language, social, code-style, frameworks, infrastructure, docs, release, databases, monorepo, community, security, developer-tooling. **Mutually exclusive with `--exclude`** — error if both provided
- `--exclude <categories>`: skip named categories. Same names as `--include`. Also accepts display group alias: `tech-stack` expands to language,frameworks,infrastructure,docs,release,databases,monorepo,developer-tooling. **Mutually exclusive with `--include`**
- `--style <style>`: override badge style (flat, flat-square, plastic, for-the-badge, social)
- `--layout <layout>`: badge arrangement — inline (default), centered, grouped, table, collapsible. `collapsible` wraps secondary groups (Tech Stack, Social) in `<details><summary>` elements — ideal for 15+ badges. See style-guide.md
- `--readme <path>`: target a specific file instead of auto-detected README
- `--dark-mode`: generate `<picture>` elements with `<source media="(prefers-color-scheme: dark)">` for theme-aware badges on GitHub. Produce HTML instead of pure markdown
- `--dry-run`: output proposed badge block and diff without modifying any file. Exit after preview
- `--yes`: skip approval prompt before modifying files
- `--replace`: replace content within markers AND consolidate scattered badges into the marker block

## Internal Phase 3 — Present

Show grouped preview with category headers. Render badges as actual `[![alt](url)](link)` markdown so the user can see them.

Diff indicators when updating existing badges:
- `[+]` new badge being added
- `[=]` existing badge being kept
- `[-]` existing badge being removed

If scattered badges exist outside markers, show their locations and offer to consolidate into the marker block.

If user requests removal only (e.g., "remove social badges"), skip detection, read existing badge block, remove specified badges, present updated block.

Offer to reorder, add, or remove individual badges before finalizing. Accept natural language adjustments ("move stars before license", "drop the forks badge", "add a Discord badge").

Ask for approval before modifying files. Skip approval if `--yes` passed. **Never skip prompts for missing required info** (owner/repo, workflow file names, etc.) even with `--yes`.

If `--dry-run`, output the proposed block and exit without modifying files.

## Internal Phase 4 — Insert

Find existing `<!-- BADGES:START -->` / `<!-- BADGES:END -->` markers or create them.

Insert approved badges grouped by display super-group (Status, Quality, Package, Tech Stack, Social). Separate groups with a blank line. Add `<!-- generated by add-badges YYYY-MM-DD -->` comment inside the marker block.

Insertion point priority:
1. Existing markers (replace content between them)
2. After first `# Title` heading
3. Top of file if no heading found

If no README exists, create one with `# {repo-name}` heading then add badges.

If `--dark-mode`, wrap each badge in `<picture>` elements per style-guide.md.

`--replace` consolidates any scattered badges found outside markers into the marker block. Show user exactly what will be moved — nothing silently deleted.

Preserve any manual content outside markers.

After insertion, optionally run `uv run python skills/add-badges/scripts/validate-badges.py <readme-path>` via Bash to verify all badge URLs return valid responses. Report any broken or slow badges to the user.

## Stop Hooks

Stop and ask instead of writing when any of these are true:

- the target README path is unclear
- required repo identity details are missing for dynamic badges
- workflow file names or badge-specific parameters are missing
- the user did not approve a write and `--yes` was not passed
- `--replace` would move or consolidate scattered badges the user has not seen yet

For write operations:

- `--dry-run` must always stop after preview and diff
- approval is mandatory before insertion unless `--yes` is explicit
- missing required info never gets bypassed by `--yes`
- preserve all non-marker README content and stop if the requested change would require broader README editing

## Style Rules

Default style: `flat-square`. Match existing style if badges already present. Use `for-the-badge` for hero/landing sections. Use `social` style for star/follow count badges. Separate display groups with a blank line in the output.

## Error Handling

- No git remote: prompt for `owner/repo`. If user declines, generate only static language/framework/tooling badges (no remote-dependent badges)
- No manifest files: static-only badges
- RST/AsciiDoc README: use appropriate image syntax (see style-guide.md for format-specific syntax)
- Mixed existing styles: recommend standardizing, ask user which style
- Style-only change (`--style` with no other changes): preserve current badge set, update style param only
- Private repo detected: skip `requires: public-api` badges, prefer native badge URLs, warn user
- detect.py produces partial results: work with what is available, note missing sections

## Tricky Icon Slugs

Common Simple Icons gotchas: `gnubash` not `bash`, `nodedotjs` not `node`, `vuedotjs` not `vue`, `nextdotjs` not `next`, `.env` is `dotenv`, `springboot` not `spring-boot`, `flydotio` not `fly`. Note: `nuxt` is now correct (was `nuxtdotjs`). For icons not in the catalog, use lowercase brand name; check simpleicons.org if unsure.

## Golden Example

```markdown
<!-- BADGES:START -->
<!-- generated by add-badges 2025-01-15 -->
[![CI](https://github.com/{owner}/{repo}/actions/workflows/ci.yml/badge.svg)](https://github.com/{owner}/{repo}/actions)
[![PyPI](https://img.shields.io/pypi/v/{package}?style=flat-square&logo=pypi&logoColor=white)](https://pypi.org/project/{package}/)
[![License](https://img.shields.io/github/license/{owner}/{repo}?style=flat-square)](https://github.com/{owner}/{repo}/blob/main/LICENSE)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/{owner}/{repo}/badge)](https://scorecard.dev/viewer/?uri=github.com/{owner}/{repo})
<!-- BADGES:END -->
```

## Reference File Index

| File | Read When |
|------|-----------|
| `references/badge-catalog-core.md` | Always — provides base badge definitions for common categories |
| `references/badge-catalog-extended.md` | Detection reports non-basic signals (frameworks, infrastructure, linters, docs, etc.) |
| `references/style-guide.md` | Determining layout, ordering, URL conventions, and format-specific syntax |

## Canonical Vocabulary

| Canonical Term | Meaning |
|----------------|---------|
| badge | A shields.io (or similar) image element displaying project metadata |
| shield | Synonym for badge; the rendered SVG from shields.io |
| style | Visual variant: flat, flat-square, plastic, for-the-badge, social |
| super-group | Display grouping: Status, Quality, Package, Tech Stack, Social |
| category | Classification of a badge type (e.g., license, language, frameworks) |
| marker | HTML comments (`<!-- BADGES:START/END -->`) delimiting the badge block |
| slug | Simple Icons identifier used in `?logo=` parameter (e.g., `gnubash`) |
| profile | Preset badge selection by project maturity: new, active, mature, enterprise |
| dynamic badge | Badge that fetches live data from an endpoint (version, coverage, downloads) |
| static badge | Badge with hardcoded text — avoid when a dynamic alternative exists |

## Scope Boundaries

**IS for:** badge detection, badge selection, badge preview, badge insertion inside marker blocks, and badge-specific README updates.

**NOT for:** general README rewriting, broader docs work, CI/CD design, or non-badge documentation changes.

## Critical Rules

Non-negotiable constraints for every badge operation:

1. **Never hardcode dynamic values.** Always use shields.io dynamic endpoints for versions, coverage, and download counts.
2. **Always include logo parameters.** Every badge with a Simple Icons slug must have `?logo={slug}&logoColor={white|black}`.
3. **Respect existing style.** Match the style of badges already present in the README; default to `flat-square` only when no badges exist.
4. **Never modify content outside markers.** Preserve all manual content outside `<!-- BADGES:START -->` / `<!-- BADGES:END -->` markers.
5. **Always ask before writing.** Never modify the README without user approval unless `--yes` was explicitly passed.
6. **Check icon slugs carefully.** Use the Tricky Icon Slugs list; verify against simpleicons.org when uncertain.
7. **Skip private-incompatible badges.** When `repo.visibility` is `"private"`, never generate badges marked `requires: public-api`.
