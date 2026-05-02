---
name: architecture
description: Architecture principles, module boundaries, folder structure, and project type profiles
---

# Architecture Skill

**Version:** 3.0
**Source:** Architecture Principles + Project Structure Profiles

> How to structure a project — both logically (module design, dependency flow) and physically (folder layout, naming, type-specific conventions).

## The Problem

AI agents don't remember where they put things last session. Without explicit structure, each session invents its own folder layout, module boundaries, and dependency patterns — leading to scattered files, circular imports, and architectures that only make sense to the session that created them. These standards define one structure so every session builds in the same place.

## Consumption

- **Builders:** Read `## Builder Checklist` before creating files or folders. Follow the project type profile that matches your target.
- **Refactorers:** Use `## Enforced Rules` to find structural violations. Read narrative sections for migration guidance.
- **Both:** Narrative sections are the authoritative standard. Checklist and rules table are compressed views of the same content.

---

## Scope and Boundaries

**This skill covers:** Module design, dependency flow, folder structure, naming conventions, and project-type-specific layouts.

**This skill does NOT cover:** Code quality within files (see `code-quality`), documentation standards (see `documentation`), or build/deploy configuration.

**Relationship to other skills:**
- Works alongside `code-quality` (file-level conventions) and `documentation` (docs standards)
- Consumed by clean-team `:audit` command (with focus: `structure`)
- Referenced by clean-team, implement-team, and diagnose-team agents

---

## North Star

**Goal:** Small changes stay local.

A typical feature should touch 1-2 modules, ship quickly, and not require coordinated edits across the system. If you find yourself editing 5+ files across multiple layers for a simple change, that's a design smell.

---

## Core Principles

### 1. Explicit Over Magic

Prefer readable wiring over convention-heavy frameworks. When someone reads your code, the control flow should be obvious. No `@AutoInject()` decorators that hide what depends on what — use explicit constructor parameters.

### 2. Boundaries Are Sacred

Modules communicate only through contracts (APIs, props, events). No reaching into another module's internals. Import from the module's public API, never from internal files.

### 3. Own Your Data

Each module owns its schema/state. Other modules read via APIs or props, never direct access. If OrderModule needs user data, it calls `UserModule.getUserById()` — it doesn't query the users table directly.

### 4. Optimize for Refactoring

If code is hard to move or rename, it's a design smell. Loose coupling enables safe refactoring.

---

## The 3 Layers

```
01-presentation/  →  02-logic/  →  03-data/
```

| Layer | Responsibility | Examples |
|-------|----------------|----------|
| **Presentation** | What users see and interact with | Components, pages, styles |
| **Logic** | How it's built, business rules | Services, use cases, validation |
| **Data** | How it persists, external sources | Repositories, models, adapters |

### Valid Dependency Flow

```
Presentation → Logic → Data ✅
Data → Logic ❌ (blocked)
Logic → Presentation ❌ (blocked)
Presentation → Data ❌ (blocked — no layer skipping)
```

---

## Module Boundaries

A module is a cohesive unit with a clear public API, hidden implementation, and defined dependencies.

### Module Rules

**Single Entry Point:** Each module exposes its API through an index file. External imports MUST go through it.

**No Circular Dependencies:** Modules cannot depend on each other in a cycle. Break cycles by extracting shared code, using events, or introducing an interface.

**Own Your Data:** Each module owns its data exclusively. Cross-module data is accessed via APIs, never direct DB queries.

### Coupling Guidelines

| Coupling Type | OK? |
|--------------|-----|
| Type import | Always |
| Function call via public API | Usually |
| Direct instantiation | Carefully |
| Shared mutable state | Avoid |

> **Full details:** `references/module-boundaries.md` — Module structure, boundary rules, communication patterns, coupling levels, refactoring guidance

---

## Folder Structure

A well-organized project isn't just tidy — it's a project where you never have to ask "where does this go?" or "where would I find that?" The structure itself answers those questions. When folders mirror how you think about the project, navigation becomes intuitive rather than a search exercise. You find things where you expect them to be, on the first try.

This matters even more when AI is involved. AI has no memory between sessions — it can't learn your project's layout over time the way a human teammate would. Every session starts fresh. A clear, predictable structure means the AI spends less time searching and more time doing useful work. Descriptive folder names, consistent conventions, and logical grouping are context that the AI reads for free on every interaction.

**The goal: any file should be findable in 2-3 navigation steps based on intuition alone. If you have to search, the structure failed.**

### Organize by Feature Within Tiers

For web projects using 3-tier architecture, organize by feature WITHIN each tier — don't scatter a single feature across global `models/`, `services/`, `controllers/` directories.

```
Within 02-logic/:
Prefer:                          Avoid:
02-logic/                        02-logic/
  users/                           models/
    user.model.ts                    user.model.ts
    user.service.ts                  order.model.ts
  orders/                          services/
    ...                              user.service.ts
                                     order.service.ts
```

Feature-based grouping keeps related code together within each tier. Tiers enforce dependency flow (presentation → logic → data), while feature folders enforce cohesion within each tier. These are complementary, not contradictory.

**For non-web projects** (CLI tools, libraries, scripts) that don't use 3-tier architecture, apply feature-based grouping at the project root level.

### Universal Structural Principles

These apply to every project regardless of type.

**Naming Consistency** — Pick one casing convention per category and apply it everywhere. All components PascalCase, all utilities camelCase, all configs kebab-case. Consistency makes things findable — when you know the convention, you can predict the file name before you look.

**Logical Grouping** — Related files live together. If you change one, you'll likely change the others. Co-locate by default. Only separate when there's a clear benefit. The test for grouping: "If I'm working on X, what else will I need open?"

**Reasonable Depth** — No more than 4 levels from root to file. Every level of nesting must earn its place. If a folder contains only one subfolder containing one file — flatten it. Deep nesting isn't organization, it's a scavenger hunt.

**Clear Entry Point** — Someone opening the project for the first time should know where to start within 10 seconds. Root README explains what the project is. The main entry file is named conventionally (`index`, `main`, `app`). Top-level folders tell the story of what the project *is*.

**Clean Root** — The project root should contain only what *must* be there — entry points, top-level config, and the folders that define the project's structure. Config files that must live at root (`.gitignore`, `package.json`, `tsconfig.json`) get a pass — stray scripts, utilities, and one-off files do not. When in doubt, move it deeper. The root is the first impression.

**Self-Documenting Names** — Folder names describe what's inside, not how it's used. `formatters/`, `validators/`, `parsers/` are clear. `utils/`, `helpers/`, `misc/` are dumping grounds. If a folder has more than 10 files with no shared theme, split by what the files actually do.

---

## Project Type Profiles

Type-specific folder structures, naming conventions, and red flags. Each profile is a self-contained reference.

### Detection Decision Tree

```
Does the project contain...

  ├─ package.json + .tsx/.jsx/.css/.html files?
  │  └─ YES → Load references/web.md
  │
  ├─ Assets/ + .cs scripts + .unity scene files?
  │  ├─ VRChat SDK present? (Packages/com.vrchat.*, VRCSDK3, UdonSharp)
  │  │  └─ YES → Load references/vrchat.md (overrides Unity)
  │  └─ No VRC SDK
  │     └─ Load references/unity.md
  │
  ├─ .blend files + texture images?
  │  └─ YES → Load references/blender.md
  │
  ├─ .tf files / cdk.json / template.yaml?
  │  └─ YES → Load references/data-iac.md
  │
  └─ None of the above?
     └─ Use Universal Structural Principles above
```

**Priority rule:** When multiple profiles match, use the most specific. VRChat overrides Unity. A project with both application code and IaC should use the application profile for the app and reference data-iac for the infrastructure portion.

### Available Profiles

| Profile | Reference File | Best For |
|---------|---------------|----------|
| Web (React/Node) | `references/web.md` | SPAs, fullstack apps, Node APIs, React projects |
| Unity | `references/unity.md` | Unity games, tools, non-VRChat Unity projects |
| VRChat | `references/vrchat.md` | VRChat worlds and avatars (extends Unity) |
| Blender | `references/blender.md` | 3D modeling, texturing, rendering projects |
| Data/IaC (AWS) | `references/data-iac.md` | Terraform, CDK, CloudFormation infrastructure |

### How to Use

1. **Detect** the project type using the decision tree above
2. **Load** the matching profile from `references/`
3. **Compare** the actual structure against the expected layout
4. **Evaluate** using the checklist in `assets/structure-evaluation-checklist.md`
5. **Flag** deviations as findings — prioritize red flags highest

### Adding a New Profile

1. Create `references/<type>.md` following the standard template:
   - **Why This Structure Matters** — problem, benefit, cost of ignoring
   - **Detection** — file patterns that identify this project type
   - **Expected Structure** — annotated directory tree with principle comments
   - **Naming Conventions** — table of type/convention/example
   - **Red Flags** — 3-column table: Flag | Root Cause | Fix
   - **When to Reconsider** — symptom → problem → action table
2. Add a row to the Available Profiles table above
3. Add a branch to the Detection Decision Tree
4. Add a type-specific section to `assets/structure-evaluation-checklist.md`

---

## Pattern Selection

| Pattern | Use When |
|---------|----------|
| Pure functions | Stateless transformations |
| Module with functions | Grouping related functions |
| Class | State or DI needed |
| Factory | Complex object creation |
| Repository | Data access abstraction |

**Default to simplicity:** Function → Module → Class → Pattern

> **Full catalog:** `references/design-patterns.md` — Factory, Builder, Adapter, Facade, Decorator, Strategy, Observer, Command, Repository, Result Type

---

## Testing Strategy

| Type | Purpose | Scope | Volume |
|------|---------|-------|--------|
| **Unit** | Fast, deterministic, domain-heavy | Single function/component | Heavy |
| **Integration** | DB, APIs, external services | Module boundaries | Moderate |
| **E2E** | Critical user paths only | Full stack | Minimal |

Heavy unit tests, moderate integration, minimal E2E. E2E sprawl leads to brittle, slow test suites. Contract tests recommended for API boundaries.

---

## Anti-Patterns

### Code Architecture

| Anti-Pattern | Symptom | Fix |
|--------------|---------|-----|
| **God Object** | >500 lines, >10 public exports | Extract cohesive submodules |
| **Anemic Domain Model** | Getters/setters only, services do all work | Move behavior to entities |
| **Shotgun Surgery** | Adding a field requires 5+ file changes | Better encapsulation |

### Project Structure

| Anti-Pattern | Symptom | Fix |
|-------------|---------|-----|
| **Cluttered Root** | 15+ files at project root, stray scripts alongside config | Move everything that isn't an entry point or required config into folders |
| **God Folder** | One folder with 40+ files | Group by domain, feature, or function |
| **Ghost Folders** | Empty folders with no files and no clear purpose | Delete unless part of an intentional pattern |
| **Naming Soup** | Mixed casing: `UserProfile.tsx`, `order-utils.ts`, `payment_service.py` | Pick one convention per file type, enforce it |
| **Orphaned Files** | Files that nothing imports or references | Verify unused, then delete |
| **Deep Nesting** | 5+ folder levels to reach a single file | Flatten — levels should reflect real boundaries |
| **Mirror Trees** | `src/` and `tests/` with identical structures | Co-locate unit tests with source; separate tree only for integration/E2E |
| **Config Explosion** | 10+ config files at root | Consolidate where possible, move to `config/` |

---

## When to Extract

Start with a modular monolith (single deployable, clean internal boundaries).

**Extract to separate services only when:**

| Reason | Example |
|--------|---------|
| **Scale** | One part needs independent scaling |
| **Team** | Separate teams need independent deploy cycles |
| **Technology** | A component needs a different runtime/language |

**Don't extract for "cleanliness"** — that adds operational complexity without benefit.

---

## Observability Basics

**Structured Logging:** JSON, not string concatenation. Include context (`{ userId, timestamp }`), not messages (`'User ' + userId + ' logged in'`).

**Correlation IDs:** Track requests across async operations.

**Error Boundaries:** Catch and report, don't swallow silently.

---

## Decision Records

For significant architectural choices, document: Context (problem), Decision (what we chose), Alternatives (what else we considered), Consequences (trade-offs).

**Location:** `Documentation/decisions/`

> **Template:** `assets/decision-record-template.md`

---

## Scaling Principles

| Project Size | Focus On |
|--------------|----------|
| **Small** | North Star, Red Flags |
| **Growing** | Add Testing Strategy, Observability |
| **Team** | Add Decision Records, Module Ownership |

---

## Red Flags

Stop and reconsider when you see:

| Smell | Problem | Fix |
|-------|---------|-----|
| `shared/common/utils` dumping ground | Ownership unclear, grows forever | Move to owning module or create focused package |
| Cross-module direct imports | Tight coupling | Use APIs, events, or props |
| Direct database access across modules | Hidden dependencies | Build a read API or service |
| "Quick helper" in wrong module | Boundary violation | Move to correct owner |
| Framework magic hiding control flow | Hard to debug, hard to refactor | Make it explicit |
| Feature touching 5+ unrelated files | Poor separation | Refactor boundaries |

---

## Builder Checklist

Before designing modules or folder structure, verify your plan against these constraints. Builders read this section before writing code; refactorers use the Enforced Rules table and full narrative instead.

### Structure
- [ ] 3-tier architecture: `01-presentation/` → `02-logic/` → `03-data/`
- [ ] No reverse dependencies (data → logic, logic → presentation)
- [ ] No layer skipping (presentation → data)
- [ ] Max 4 folder levels from root to file
- [ ] Clean root — only entry points and required config at top level

### Modules
- [ ] Each module has a single entry point (index file)
- [ ] No circular dependencies between modules
- [ ] Each module owns its data — no cross-module direct DB access
- [ ] Feature-organized within tiers (not global `models/`, `services/` folders)

### Design
- [ ] Default to simplicity: function → module → class → pattern
- [ ] Small changes stay local (feature touches 1-2 modules, not 5+)
- [ ] No `shared/common/utils` dumping grounds
- [ ] Folder names describe what's inside (not `helpers/`, `misc/`)

---

## Enforced Rules

These rules are deterministically checked by `check.js` (clean-team). When updating these standards, update the corresponding check.js rules to match — and vice versa.

| Rule ID | Severity | What It Checks |
|---------|----------|---------------|
| `tier-imports` | error | Imports that violate 01→02→03 dependency direction |
| `tier-structure` | error | Missing or incomplete 3-tier folder structure in web projects |

---

## References

- `references/module-boundaries.md` — Module structure, boundary rules, communication patterns
- `references/design-patterns.md` — Factory, Repository, Adapter, Strategy, Observer, etc.
- `references/migration-patterns.md` — Strangler Fig, Branch by Abstraction, Parallel Implementations
- `references/web.md` — Web (React/Node) project structure profile
- `references/unity.md` — Unity project structure profile
- `references/vrchat.md` — VRChat project structure profile (extends Unity)
- `references/blender.md` — Blender project structure profile
- `references/data-iac.md` — Data/IaC (AWS) project structure profile

## Assets

- `assets/architecture-checklist.md` — Full architecture review checklist
- `assets/structure-evaluation-checklist.md` — Project structure evaluation checklist (universal + per-type)
- `assets/decision-record-template.md` — ADR template

## Scripts

- `scripts/analyze_dependencies.py` — Map circular dependencies and detect layer violations
