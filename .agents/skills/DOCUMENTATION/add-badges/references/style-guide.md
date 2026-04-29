# Badge Style Guide

Reference for badge styling, ordering, layout, and URL conventions.

---

## 1. Style Comparison

| Style | Height | Aesthetics | Best For |
|-------|--------|-----------|----------|
| `flat` | 20px | Clean, minimal | Most projects (GitHub default) |
| `flat-square` | 20px | Modern, crisp edges | Tech projects, CLI tools |
| `plastic` | 18px | Glossy, 3D effect | Retro feel, npm ecosystem |
| `for-the-badge` | 28px | Large, bold, uppercase | Hero sections, landing pages |
| `social` | 20px | GitHub-style counters | Stars, follows, subscriber counts |

---

## 2. Badge Ordering Convention

Order badges left to right, top to bottom:

1. **Status** -- CI/CD, build status (most important -- is it working?)
2. **Quality** -- Coverage, code quality, security (is it good?)
3. **Package** -- Version, downloads, license (can I use it?)
4. **Tech Stack** -- Language, framework, infrastructure (what is it?)
5. **Social** -- Stars, forks, contributors (who uses it?)

Rationale: follows the reader's decision funnel -- "does it work -> is it good -> can I use it -> what is it -> who else uses it."

---

## 3. Layout Options

### Inline (default)

Badges in a single flow, wrapping naturally.

```markdown
[![CI](url)](link) [![Coverage](url)](link) [![Version](url)](link)
```

### Centered

Wrapped in `<p align="center">`.

```html
<p align="center">
  <a href="link"><img src="url" alt="CI"></a>
  <a href="link"><img src="url" alt="Coverage"></a>
</p>
```

### Grouped

Blank line between category groups.

```markdown
[![CI](url)](link) [![Coverage](url)](link)

[![Version](url)](link) [![License](url)](link)

[![Python](url)](link) [![FastAPI](url)](link)
```

### Table

Using markdown table (rare, for READMEs with many badges).

```markdown
| Status | Package | Stack |
|--------|---------|-------|
| [![CI](url)](link) | [![Version](url)](link) | [![Python](url)](link) |
```

### Collapsible

Wraps secondary badge groups in `<details><summary>` elements. Ideal for 15+ badges -- keeps Status/Quality/Package visible, collapses Tech Stack and Social. Produces HTML.

```html
<!-- Primary badges visible -->
[![CI](url)](link) [![Coverage](url)](link) [![PyPI](url)](link)

<details>
<summary>More badges</summary>

[![Python](url)](link) [![FastAPI](url)](link) [![Docker](url)](link)

[![Stars](url)](link) [![Contributors](url)](link)
</details>
```

---

## 4. URL Encoding Rules

| Character | Encoding | Example |
|-----------|----------|---------|
| Space | `%20` or `_` | `my_badge` or `my%20badge` |
| Hyphen (literal) | `--` | `up--to--date` renders "up-to-date" |
| Underscore (literal) | `__` | `my__var` renders "my_var" |
| Plus | `%2B` | `C%2B%2B` renders "C++" |
| Hash | `%23` | `%23fff` renders "#fff" |

In shields.io static badge URLs (`/badge/label-message-color`), hyphens separate the three parts. Use `--` for a literal hyphen within any part.

---

## 5. logoColor Guidance

**Always set `logoColor` explicitly** -- shields.io auto-selection uses an opaque contrast heuristic that produces unpredictable results.

Brightness heuristic:

1. Convert badge background hex to decimal: R, G, B
2. Calculate brightness: `(R * 299 + G * 587 + B * 114) / 1000`
3. If brightness < 128 -> `logoColor=white` (dark background)
4. If brightness >= 128 -> `logoColor=black` (light background)

In practice: most badges have dark or colored backgrounds, so `logoColor=white` is the safe default. Use `logoColor=black` only for badges with very light backgrounds (e.g., white or light grey).

---

## 6. Quantity and Density Guidelines

- **Ideal**: 8-15 badges
- **Minimum**: 3-5 for minimal projects
- **Maximum**: ~20 before it gets noisy
- **Rule of thumb**: if badges take more than 3 rendered lines, consider trimming or grouping

---

## 7. badgen.net vs shields.io

| Feature | shields.io | badgen.net |
|---------|-----------|------------|
| Base URL | `img.shields.io` | `badgen.net` |
| Icon param | `logo=slug` | `icon=slug` |
| Icon color | `logoColor=white` | Not supported |
| Style param | `?style=flat-square` | Subdomain: `flat.badgen.net` |
| Static badge | `/badge/label-message-color` | `/badge/label/message/color` |
| Dynamic paths | `/github/stars/org/repo` | `/github/stars/org/repo` |
| CDN | Cloudflare | Cloudflare |

badgen.net path format uses `/` separators vs shields.io uses `-` in static badges.

---

## 8. forthebadge.com Reference

**API**: `https://forthebadge.com/api/badges/generate?primaryLabel={label}&secondaryLabel={value}`

Key parameters:

- `primaryLabel`: Left side text
- `secondaryLabel`: Right side text
- `primaryBGColor`: Left background hex (without `#`)
- `secondaryBGColor`: Right background hex (without `#`)
- `primaryIcon`: Icon identifier
- `scale`: Badge scale multiplier
- `borderRadius`: Corner rounding in px

**Distinctions from shields.io `?style=for-the-badge`**:

- forthebadge.com: Roboto/Montserrat fonts, 35px height, 0px border-radius
- shields.io for-the-badge: Verdana font, 28px height, 3px border-radius
- forthebadge.com is **decorative only** -- no dynamic data (stars, version, downloads)
- For dynamic badges in large bold style, use shields.io `?style=for-the-badge`

---

## 9. Dark Mode Badge Markup

GitHub supports `<picture>` elements for theme-aware content:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white">
  <source media="(prefers-color-scheme: light)" srcset="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white">
  <img alt="Python" src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white">
</picture>
```

Notes:

- Works on GitHub (README, issues, PRs, wiki)
- Does NOT work on npm, PyPI, crates.io, or most other renderers
- Produces HTML instead of pure markdown -- some projects prefer pure markdown
- Main use case: badges with white text on dark backgrounds that become invisible in dark mode

---

## 10. Native Badge URL Reference

| Service | URL Template | Notes |
|---------|-------------|-------|
| GitHub Actions | `https://github.com/{owner}/{repo}/actions/workflows/{file}/badge.svg` | Works for private repos |
| GitHub Actions (branch) | `https://github.com/{owner}/{repo}/actions/workflows/{file}/badge.svg?branch={branch}` | Filter by branch |
| Codecov | `https://codecov.io/gh/{owner}/{repo}/graph/badge.svg?token={token}` | Token needed for private |
| Coveralls | `https://coveralls.io/repos/github/{owner}/{repo}/badge.svg?branch={branch}` | |
| SonarCloud | `https://sonarcloud.io/api/project_badges/measure?project={key}&metric={metric}` | Metrics: alert_status, coverage, bugs, code_smells, etc. |
| CircleCI | `https://dl.circleci.com/status-badge/img/gh/{owner}/{repo}/tree/{branch}.svg` | |
| GitLab CI | `https://gitlab.com/{owner}/{repo}/badges/{branch}/pipeline.svg` | |
| OpenSSF Scorecard | `https://api.scorecard.dev/projects/github.com/{owner}/{repo}/badge` | 302-redirects to shields.io; still works for `<img>` tags |
| OpenSSF Best Practices | `https://bestpractices.dev/projects/{id}/badge` | Requires enrollment |
| pkg.go.dev | `https://pkg.go.dev/badge/{module}.svg` | |
| Read the Docs | `https://readthedocs.org/projects/{project}/badge/?version=latest` | |

---

## 11. Dead Badge Services

| Dead Service | Replacement | Notes |
|-------------|-------------|-------|
| `david-dm.org` | shields.io `/librariesio/...` or Snyk | David-DM shut down ~2021 |
| `godoc.org` | `pkg.go.dev` | Redirects to pkg.go.dev |
| `goreportcard.com` (sometimes) | Still works, but check | Intermittent availability |

Note: `travis-ci.org` redirects (301) to `travis-ci.com`. The `.org` domain shut down for builds in late 2020. Badges using `.org` URLs still render via redirect but should be updated to `.com`. Do not flag as fully dead (redirect preserves functionality) but recommend migration.

---

## 12. Shields.io Endpoint Badge

For custom JSON API metrics:

```
https://img.shields.io/badge/dynamic/json?url={encoded_url}&query={jsonpath}&label={label}&style=flat-square&logo={slug}&logoColor=white
```

Parameters:

- `url`: URL-encoded endpoint returning JSON
- `query`: JSONPath expression (e.g., `$.version`, `$.data.count`)
- `label`: Left side text
- `prefix` / `suffix`: Optional text before/after the value
- `color`: Badge color (or use `auto` with the JSON response)

---

## 13. Link Style Options

### Inline (recommended -- self-contained)

```markdown
[![Alt text](https://img.shields.io/...)](https://link.target)
```

### Reference-style (cleaner for many badges -- links defined at bottom)

```markdown
[![Alt text][badge-name]][badge-link]

[badge-name]: https://img.shields.io/...
[badge-link]: https://link.target
```

---

## 14. Badge Syntax by Format

### Markdown (`.md`)

```markdown
[![Alt](image-url)](link-url)
```

### HTML (in markdown or `.html`)

```html
<a href="link-url"><img src="image-url" alt="Alt"></a>
```

### reStructuredText (`.rst`)

```rst
.. image:: image-url
   :target: link-url
   :alt: Alt
```

### AsciiDoc (`.adoc`)

```asciidoc
image:image-url[Alt, link=link-url]
```

---

## 15. Marker Comment Syntax by Format

### Markdown / reStructuredText

```
<!-- BADGES:START -->
...badges...
<!-- BADGES:END -->
```

### AsciiDoc

```
// BADGES:START
...badges...
// BADGES:END
```

### HTML

```html
<!-- BADGES:START -->
...badges...
<!-- BADGES:END -->
```
