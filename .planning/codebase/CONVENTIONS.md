# Coding Conventions

**Analysis Date:** 2026-07-14

## TypeScript Style

- Use strict TypeScript; `tsconfig.json` enables `strict` and `forceConsistentCasingInFileNames`.
- Prefer explicit exported interfaces and union types at module boundaries.
- Use `import type` for type-only dependencies.
- Keep modules in CommonJS-compatible TypeScript targeting ES2022.
- Prefer `async` functions for any boundary that may invoke Host or WSL effects.

## Naming

- Files use lower camel-case names such as `toolsProvider.ts`, `skillStore.ts`, and `workspaceFs.ts`.
- Functions and variables use `camelCase`.
- Types and interfaces use `PascalCase`.
- Constants use `UPPER_SNAKE_CASE` in `src/constants.ts`.
- Public tool names use `snake_case` and are listed in `PUBLIC_TOOL_NAMES`.

## Module Boundaries

- Keep LM Studio SDK-specific code at the plugin boundary: `src/config.ts`, `src/index.ts`, and `src/toolsProvider.ts`.
- Keep platform effects behind abstractions such as `SkillStore`, `WorkspaceFileSystem`, and injected process runners.
- Keep pure path policy in `src/pathPolicy.ts`.
- Do not access Host `fs` directly from WSL-aware tool implementations.
- Do not duplicate environment selection logic across tools; resolve it once through `EffectiveConfig` and shared services.

## Function Design

- Use small pure helpers for classification, formatting, and identity derivation.
- Use dependency injection for process runners, workspace resolvers, filesystem factories, and skill stores.
- Return structured result objects from low-level process functions.
- Throw contextual errors from service layers and translate them to `{ success: false, error }` at tool boundaries.
- Keep public tool implementations thin: validate parameters, call a service, shape a stable response.

## Error Handling

- Include operation, environment, distribution, or path context in errors.
- Reject invalid or wrong-environment paths; never silently translate or fall back.
- Preserve timeout state and termination uncertainty separately.
- Avoid empty catch blocks except for best-effort persistence/bootstrap paths such as `src/settings.ts`; new silent catches require justification.
- Use `error instanceof Error ? error.message : String(error)` when normalizing unknown errors.

## Path and Security Rules

- Resolve paths with the path API matching the selected environment (`path.win32` or `path.posix`).
- Apply lexical validation and canonical containment before filesystem mutation.
- Treat skill roots and project workspace roots as separate boundaries.
- Never use raw shell interpolation for WSL file content; use argv plus stdin.
- Preserve the workspace root as immutable from tool operations.

## Environment Rules

- Host and WSL behavior must remain coherent across all environment-sensitive tools.
- WSL paths are Linux-native and WSL commands use `/bin/bash`.
- Windows Host shell selection may be cmd, PowerShell, Git Bash, or an explicit Host shell path.
- Host shell settings must not affect WSL execution.
- `change_directory` affects command cwd only; project file paths remain workspace-root scoped.

## Public API Compatibility

- Update `PUBLIC_TOOL_NAMES` and `test/compatibility.test.ts` whenever adding or renaming a tool.
- Prefer additive response fields over removing or renaming existing required fields.
- Do not assert complete response-object equality in compatibility tests; assert required fields and behavior.
- Keep Zod descriptions accurate because models use them as operational guidance.

## Formatting

- Use two-space indentation.
- Use double quotes in TypeScript.
- Use trailing commas in multiline literals and calls.
- Keep lines readable; long tool descriptions may be concatenated across strings.
- Use early returns for invalid states.
- Use blank lines between logical sections inside large functions.

## Configuration Changes

A new setting normally requires coordinated changes in:

- `src/config.ts` for LM Studio UI schema.
- `src/types.ts` for persisted/effective types.
- `src/settings.ts` for validation, defaults, persistence, and environment handling.
- `test/settings.test.ts` for migration/default/invalid-value coverage.
- `README.md` and relevant docs.

## Adding Tools

For a new project-scoped tool:

1. Extend `WorkspaceFileSystem` if a new filesystem primitive is required.
2. Implement Host and WSL behavior behind that interface.
3. Add the tool and Zod schema in `src/toolsProvider.ts`.
4. Add its name to `PUBLIC_TOOL_NAMES`.
5. Add compatibility and environment-alignment coverage.
6. Update README and release documentation.

## Comments and Documentation

- Prefer code that communicates through types and names.
- Add comments for non-obvious platform behavior, security reasoning, or SDK constraints.
- Do not narrate obvious control flow.
- Keep user documentation synchronized with actual defaults and path semantics.

---

*Convention analysis: 2026-07-14*
