---
mapped_at: 2026-07-13
focus: quality
---

# Coding Conventions

## TypeScript Style

- The codebase uses strict TypeScript and explicit interfaces for domain records and plugin boundaries.
- Imports are grouped with external modules first, then local modules, then type-only imports.
- Double quotes and semicolons are used consistently.
- Trailing commas are common in multiline calls and object literals.
- Functions generally have explicit return types when exported or structurally important.

## Module Design

- Each file owns one primary concern.
- Shared constants are centralized in `src/constants.ts`.
- Shared data shapes are centralized in `src/types.ts`.
- LM Studio-specific structural types are isolated in `src/pluginTypes.ts`.
- Lower-level utilities are ordinary functions rather than classes.

## Error Handling

- Filesystem operations frequently use `try/catch` and return safe defaults instead of throwing.
- `src/scanner.ts` commonly returns `null`, empty arrays, or `{ error }` records.
- `src/settings.ts` silently falls back to defaults when persisted JSON cannot be loaded.
- `src/toolsProvider.ts` converts filesystem failures into structured tool responses.
- `src/executor.ts` resolves failures as `ExecResult` values rather than rejecting promises.
- Several empty catch blocks intentionally suppress environmental failures, but reduce observability.

## Validation

- Tool inputs are validated with Zod in `src/toolsProvider.ts`.
- Numeric limits are duplicated between UI config constraints and constants.
- Path checks generally normalize with `path.resolve` and compare against configured roots.
- Destructive directory deletion requires an explicit recursive flag.
- Rename operations reject path separators in the new name and avoid overwriting destinations.

## State Management

- Module-level caches are used instead of classes or services.
- Cache invalidation is time-based for settings and watcher-based for skills.
- The code favors simple process-local state appropriate to a single plugin runtime.

## Documentation

- Public behavior is documented in `README.md`.
- Non-obvious prompt behavior and explicit skill activation have inline comments in `src/preprocessor.ts`.
- Cross-platform execution logic is mostly self-documenting through names rather than extensive comments.

## Formatting and Linting

- No ESLint, Prettier, Biome, or formatting configuration is present.
- No lint script exists in `package.json`.
- Existing formatting appears manually maintained or editor-driven.

## Change Pattern

When adding a setting, update `src/config.ts`, `src/types.ts`, `src/settings.ts`, the relevant behavior module, and `README.md`.

When adding a tool, define its Zod schema and implementation in `src/toolsProvider.ts`, include it in the provider return list, and document it in `README.md`.
