# Development reference

This reference describes the source layout, module boundaries, and verification commands for plugin development.

## Source layout

The TypeScript source uses small domain folders under `src/`. Keep public entry points stable and move implementation details into focused modules.

| Path | Purpose |
|---|---|
| `src/index.ts` | LM Studio plugin entry point. |
| `src/toolsProvider.ts` | Public tool registry. It wires tool groups together and should stay small. |
| `src/tools/` | Tool implementations grouped by LM Studio tool family. |
| `src/scanner.ts` | Public scanner entry point and compatibility exports. |
| `src/scanner/` | Skill discovery, metadata parsing, path helpers, file access, and directory listing helpers. |
| `src/preprocessor.ts` | Public prompt preprocessor entry point. |
| `src/preprocessor/` | Activation parsing, message mutation, prompt rendering, diagnostics, proof strings, and timeout helpers. |
| `src/search/` | Enhanced skill-search backend code for qmd and ck. |
| `src/runtime/` | Runtime adapters and runtime selection. |

## Dependency flow

Keep dependencies flowing from public entry points into domain modules, not the other way around:

```text
index.ts
  -> toolsProvider.ts
       -> tools/*
  -> preprocessor.ts
       -> preprocessor/*

scanner.ts
  -> scanner/*

enhancedSearchProvider.ts
  -> search/*
```

Domain modules may depend on shared root modules such as `types`, `constants`, `diagnostics`, `pathResolver`, `runtime`, and `toolSchemas`. Avoid importing tool modules from scanner, runtime, or search modules.

## Naming conventions

Use folder names for domains and file names for responsibilities:

- `src/tools/<tool-family>.ts` for LM Studio tool groups, such as `skillFileTools.ts`.
- `src/scanner/<capability>.ts` for scanner capabilities, such as `fileAccess.ts`.
- `src/preprocessor/<concern>.ts` for prompt preprocessing concerns, such as `rendering.ts`.
- `src/search/<backend-or-concern>.ts` for enhanced search backends and helpers, such as `qmd.ts`.

Keep root files as compatibility entry points when other modules already import them.

## File-size maintainability

Prefer focused files over large orchestration files. Treat files over 400 lines as extraction candidates. Treat files over 800 lines as failures unless the repository adds a temporary allowlist convention with an owner, expiry date, and reason.

When reducing file size:

1. Extract one cohesive helper or tool group at a time.
2. Preserve public exports from the original entry point.
3. Avoid broad rewrites or formatting-only churn.
4. Run the project verification commands after each slice.

## Verification

Run the TypeScript build and tests before handing off a change:

```bash
npm run build
npm test
```

`npm test` already runs `npm run build` before executing `node --test tests/*.test.js`, so it is the default full verification command.

Use line counts when a change touches maintainability boundaries:

```bash
wc -l src/toolsProvider.ts src/tools/*.ts src/scanner.ts src/scanner/*.ts
```
