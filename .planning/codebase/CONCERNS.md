# Codebase Concerns

**Analysis Date:** 2026-07-14

## Priority 1 — Security and Correctness

### Host absolute skill-path checks are lexical only

`src/toolsProvider.ts` permits Host absolute paths for `read_skill_file` and `list_skill_files` by checking `resolvedTarget.startsWith(path.resolve(root) + path.sep)`.

**Risk:** This check does not canonicalize symlinks or junctions before access, unlike project workspace containment in `src/workspaceFs.ts`. A configured skill root containing a symlink could expose files outside the intended root.

**Recommended fix:** Route Host absolute skill access through the same canonical containment policy used by `WorkspaceFileSystem`, or add a dedicated canonical skill-root resolver in `src/skillStore.ts`. Add symlink/junction escape tests.

### Workspace creation still uses shell command construction

`src/workspace.ts` creates WSL directories through `execCommand()` and quoted `mkdir -p` text.

**Risk:** The path is generated internally and quoted, so immediate exploitability is low, but it violates the codebase's structured argv rule and creates a second execution style for filesystem operations.

**Recommended fix:** Replace WSL home/root setup with `execProgram("mkdir", ["-p", "--", root])` and direct `printenv HOME` or `pwd` calls. Remove `quotePosix()` if no longer needed.

### Command execution is intentionally not sandboxed

`run_command` executes arbitrary shell strings with the LM Studio process or WSL user's permissions.

**Risk:** Workspace cwd containment does not prevent shell commands from accessing paths or network resources available to the user account.

**Recommended action:** Keep documentation explicit that workspace containment applies to file tools and cwd selection, not OS-level command sandboxing. Avoid language implying full isolation.

## Priority 2 — Architecture and Maintainability

### `src/toolsProvider.ts` is oversized

At roughly 650 lines, `src/toolsProvider.ts` defines 15 tools, shared state, path/cwd resolution, service factories, and response formatting.

**Impact:** Tool additions increase merge conflicts and make it harder to review environment alignment and compatibility.

**Recommended refactor:** Extract tool factories by domain:

- `src/tools/skills.ts`
- `src/tools/files.ts`
- `src/tools/commands.ts`
- shared `src/tools/context.ts`

Keep `PUBLIC_TOOL_NAMES` and final registration order centralized.

### `src/scanner.ts` mixes several responsibilities

At roughly 534 lines, `src/scanner.ts` handles Host scanning, manifest parsing, metadata extraction, search indexing, watchers/caches, reads, and directory traversal.

**Impact:** Search, filesystem, and cache changes are coupled. WSL behavior already lives separately in `src/skillStore.ts`, increasing conceptual asymmetry.

**Recommended refactor:** Separate Host repository access, skill metadata parsing, and search ranking into distinct modules. Preserve `SkillStore` as the public abstraction.

### Configuration cache is global across controllers

`src/settings.ts` stores one module-level `cachedConfig` and timestamp.

**Risk:** Multiple simultaneous plugin/controller contexts with different live settings could reuse the wrong cached configuration within the five-second TTL.

**Recommended fix:** Cache by controller or provider identity using a `WeakMap`, or move config caching into provider/preprocessor closures. Add a multi-controller regression test.

### Tool-provider environment state is immutable after first resolution

`toolsProvider()` lazily creates and caches workspace and skill services. If settings change while the provider instance remains alive, the old environment, distribution, roots, and shell context persist.

**Risk:** Users may change Host/WSL settings and expect immediate behavior changes without recreating the provider/chat.

**Recommended action:** Confirm LM Studio lifecycle guarantees. If providers survive config changes, add a configuration fingerprint and rebuild cached services when it changes.

## Priority 3 — Cross-Platform Assumptions

### WSL depends on GNU/coreutils behavior

`src/skillStore.ts` and `src/workspaceFs.ts` use `find -printf` and common GNU utilities.

**Risk:** Minimal or non-GNU distributions may fail even though WSL itself is available.

**Recommended fix:** Detect required commands during capability validation or implement directory listing through a small portable Node/Python helper inside WSL. Keep current troubleshooting documentation meanwhile.

### Windows shell discovery uses fixed install paths

`src/executor.ts` checks specific PowerShell and Git Bash locations.

**Risk:** Portable Git, custom installations, Microsoft Store paths, or PATH-only executables may be missed.

**Recommended fix:** Prefer explicit `shellPath`, then probe PATH safely, then known locations. Preserve actionable errors and deterministic shell selection.

### WSL distribution default relies on command output ordering

`src/wslCapability.ts` treats the first listed distribution as the default when no distribution is configured.

**Risk:** `wsl --list --quiet` ordering may not be a stable default-selection contract across Windows/WSL versions.

**Recommended fix:** Use an explicit default-distribution query if supported by the targeted WSL versions, with tests for fallback behavior.

## Priority 4 — Testing and Delivery

### No repository CI workflow is present

The test and release gates are strong but run locally.

**Risk:** A contributor can push code without running `npm run verify:release`, especially if local hooks are bypassed.

**Recommended fix:** Add CI for supported Node versions and operating systems. At minimum run tests/build on Linux and Windows; retain real WSL validation as a release checkpoint.

### No coverage measurement

The suite contains 29 focused behavioral tests, but there is no line/branch coverage report or threshold.

**Impact:** Untested branches can grow unnoticed, especially in large files such as `src/toolsProvider.ts`, `src/scanner.ts`, and `src/workspaceFs.ts`.

**Recommended action:** Add Node coverage reporting (`node --test --experimental-test-coverage` where supported) and use it diagnostically before imposing thresholds.

### Real platform evidence is manual and not machine-verifiable

`docs/release-checklist.md` and planning release results capture real Host/WSL evidence manually.

**Risk:** Evidence can be mislabeled or omit exact output, as occurred during v1.0 validation.

**Recommended fix:** Add an optional diagnostic tool or script that executes a non-destructive validation bundle and emits structured JSON for attachment to release results.

## Priority 5 — Consistency and Documentation

### Default-path wording may drift

`src/config.ts`, `src/settings.ts`, README, and documentation all describe default skill roots. Environment-specific defaults make this easy to desynchronize.

**Recommended fix:** Add tests for configuration display/default values where the SDK permits, and centralize user-facing default labels near constants.

### Bootstrap is Host-only

`src/index.ts` always calls `bootstrapSkillsDir(DEFAULT_SKILLS_DIR)`, which creates/copies samples only in the Host default skill directory.

**Impact:** WSL users receive environment-aware scanning but no equivalent WSL-native bootstrap.

**Recommended decision:** Either document Host-only bootstrap explicitly or implement WSL bootstrap after effective configuration and capability resolution. Do not silently copy between Host and WSL filesystems.

### Silent persistence failures hide configuration problems

`saveSettings()` and setup helpers suppress filesystem errors.

**Risk:** Settings may appear applied in the UI but fail to persist, with no diagnostic.

**Recommended fix:** Surface best-effort warnings through plugin logging/status while retaining startup resilience.

## Files Requiring Extra Review

- `src/toolsProvider.ts` - largest orchestration/public API file.
- `src/scanner.ts` - caches, watchers, search, and Host filesystem behavior.
- `src/workspaceFs.ts` - canonical containment and destructive operations.
- `src/executor.ts` - arbitrary shell execution and process termination.
- `src/settings.ts` - global caching, persistence, and environment path interpretation.
- `src/skillStore.ts` - WSL command assumptions and skill-root containment.

## Positive Controls Already Present

- Strict TypeScript compilation.
- Cross-platform test runner cleanup.
- Deterministic public tool-name manifest.
- Environment-alignment integration test across all public tools.
- Canonical workspace containment tests.
- WSL argv/stdin tests.
- Clean release verifier with artifact and Git drift checks.
- Real Host and Ubuntu WSL release checklist.

---

*Concern analysis: 2026-07-14*
