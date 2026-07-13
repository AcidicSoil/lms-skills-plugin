---
last_mapped_commit: 32a3fb880d150ca331d2a6cebd48a74902b71187
mapped_at: 2026-07-13
focus: quality
---
# Testing and Quality Assurance

## Current Infrastructure

No automated test framework, test script, test directory, coverage configuration, or CI workflow is present in mapped product files.

`package.json` exposes only `build`, `dev`, and `push`. The current automated quality gate is therefore `npm run build`.

## Compile-Time Checks

`tsconfig.json` enables strict type checking, casing consistency, and declaration generation. `skipLibCheck` avoids full validation of dependency declaration files.

## Manual Verification Areas

### Discovery

Use temporary roots with valid and invalid `SKILL.md` and `skill.json` combinations to exercise `src/scanner.ts`, including ranking and duplicate-root behavior.

### Preprocessing

Exercise strings, object content, content arrays, multiple explicit activations, unresolved names, disabled injection, fingerprint changes, and reinjection timing in `src/preprocessor.ts`.

### Filesystem Tools

Test read, write, patch, append, delete, move, rename, create, and recursive list behavior from `src/toolsProvider.ts`, including traversal, overwrite, symlink, and missing-path cases.

### Execution

Test shell resolution, invalid working directories, timeouts, output truncation, spawn errors, environment propagation, and Windows-specific branches in `src/executor.ts`.

### Persistence

Test missing, malformed, partial, and valid settings plus the `default` reset sentinel and semicolon-delimited skill roots in `src/settings.ts`.

## Highest-Value Missing Coverage

- configured-root and path-traversal enforcement;
- symlink and junction handling;
- explicit-activation regex edge cases;
- BM25 ranking stability;
- watcher invalidation and cleanup;
- process-tree termination;
- Windows registry PATH behavior;
- prompt markup escaping.

## Recommended Shape

Use Node's built-in runner or a lightweight TypeScript framework, temporary directories, and fake `PluginController` objects. Add a built-plugin smoke test through `.lmstudio/entry.ts` after compilation.
