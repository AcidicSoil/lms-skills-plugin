---
last_mapped_commit: 32a3fb880d150ca331d2a6cebd48a74902b71187
mapped_at: 2026-07-13
focus: quality
---
# Coding Conventions

## TypeScript Style

- Strict TypeScript is configured in `tsconfig.json`.
- Source uses ES imports/exports and compiles to CommonJS.
- Public shapes use interfaces in `src/types.ts`, `src/pluginTypes.ts`, and `src/executor.ts`.
- Type-only imports use `import type` where applicable.

## Formatting

Observed conventions are two-space indentation, double quotes, semicolons, trailing commas in multiline structures, and multiline builder/schema chains. No formatter or linter configuration is present in mapped product files.

## Naming

- Functions and locals: camelCase.
- Interfaces and aliases: PascalCase.
- Constants: uppercase snake case.
- Private helpers: unexported module functions.
- Model-facing tools: lower snake case.

## Module Responsibilities

- Shared limits belong in `src/constants.ts`.
- Host configuration belongs in `src/config.ts`; persistence in `src/settings.ts`.
- Skill logic is centralized in `src/scanner.ts`.
- Shell behavior is isolated in `src/executor.ts`.
- Tool schemas and implementations are centralized in `src/toolsProvider.ts`.

## Validation

Zod validates tool arguments. Settings loaded from disk receive manual runtime checks. Path operations use Node `path` normalization. Timeouts and output limits are bounded by constants and schemas.

## Error Handling

The dominant pattern is defensive fallback. Scanner helpers return null, empty arrays, or structured errors. The preprocessor catches broadly and returns the original input. Child-process failures become `ExecResult`. `src/settings.ts` silently ignores persistence failures.

## Documentation

Comments explain non-obvious activation and watcher behavior. JSDoc appears selectively in `src/preprocessor.ts`. `README.md` documents model workflows and tool semantics.

## Change Discipline

Change `src/`, run `npm run build`, and keep generated `dist/` synchronized. Preserve model-facing names and response shapes unless intentionally versioning the plugin API.
