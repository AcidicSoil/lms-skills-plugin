# Phase 4: Contextual Workspace UI - Research

**Researched:** 2026-07-14
**Domain:** LM Studio plugin configuration schematics, workspace status modeling, and Host/WSL capability presentation
**Execution mode:** Inline substitution for `gsd-phase-researcher` (typed sub-agent dispatch unavailable)

## User Constraints

- Workspace validity is explicit; invalid or unavailable paths never fall back to the home directory.
- Host-only and WSL-only settings are shown only in their relevant environment context.
- The system default WSL distribution is the default behavior; overrides are advanced and validated.
- Chat-scoped selection, persistent profiles, and global defaults remain distinct concepts.

## Project Constraints (from AGENTS.md)

- Preserve strict TypeScript and CommonJS output.
- Run `npm test`, `npm run build`, and `npm run verify:release` before completion.
- Do not edit generated `dist/` directly.
- Treat path conversion, canonical containment, shell selection, and process behavior as security-sensitive.
- Preserve the separation between skill roots and project workspaces.

## Findings

### Existing implementation seams

- `src/config.ts` defines a static `createConfigSchematics()` chain for execution environment, WSL distribution, Host shell path, and Windows shell. [VERIFIED: codebase]
- Installed `@lmstudio/sdk` 1.5.x typings expose `field`, `scope`, and `build` on `ConfigSchematicsBuilder`, but no conditional visibility, disabled-state, or dynamic option API. [VERIFIED: installed SDK typings]
- Runtime settings normalization and persistence already live in `src/settings.ts`; workspace derivation and capability errors live in `src/workspace.ts` and `src/wslCapability.ts`. [VERIFIED: codebase]
- Phase 4 must therefore separate two concerns: static settings wording/grouping in config schematics, and runtime status/selection data exposed through plugin tools or lifecycle responses. [VERIFIED: codebase inference]

### Recommended architecture

1. Introduce a pure workspace-selection/status model in a dedicated module, rather than embedding status logic in config declarations. [VERIFIED: codebase pattern]
2. Extend persisted settings minimally with explicit workspace profile identity and environment-specific paths, while keeping normalization backward compatible. [VERIFIED: project requirements]
3. Keep `wslDistribution` empty as the canonical representation of “use system default”; validate non-empty overrides through `wslCapability.ts`. [VERIFIED: current config and requirements]
4. Use minimal static per-chat/global schematics only for bootstrap defaults, then expose the contextual workspace configuration as runtime tools. Official LM Studio examples use static schematics and read them through the tool controller at runtime. [VERIFIED: official LM Studio docs]\n5. Register environment-specific configuration tools dynamically from `toolsProvider`: return the Host configuration tool only in Host mode and the WSL configuration tool only in WSL mode. This makes irrelevant controls absent from the active tool surface without relying on unsupported conditional schematic fields. [VERIFIED: SDK tools-provider lifecycle; project inference]\n6. Add a public status/refresh tool so the UI/model can retrieve active profile, environment, path, validity, and WSL capability state. [ASSUMED]

## Standard Stack

- Existing `@lmstudio/sdk` config schematics and plugin lifecycle APIs; no new dependency. [VERIFIED: package.json]
- Existing Zod schemas for tool inputs and structured outputs. [VERIFIED: package.json/codebase]
- Node built-ins for filesystem/path checks and the existing WSL capability detector. [VERIFIED: codebase]
- Node test runner through `scripts/test.mjs`. [VERIFIED: package.json]

## Architecture Patterns

### Pure status derivation

Create a function that accepts persisted selection, effective environment, workspace resolution result, and WSL capability result, and returns a discriminated status object. Keep it deterministic and directly unit-testable.

Recommended states:
- `unset`
- `valid`
- `unavailable`
- `moved`
- `configuration-required`

WSL capability should remain a separate discriminated union so pending, executable-missing, no-distributions, no-default, and selected-unavailable are not collapsed into one boolean.

### Backward-compatible persistence

Normalize legacy settings into the new shape without requiring migration action. Empty or absent WSL distribution means default distribution. Never infer a home-directory workspace from an invalid or missing configured path.

### Static bootstrap plus contextual tool surface

Use config schematics only for stable bootstrap defaults. Build the environment-aware workspace configuration as runtime tools returned by `toolsProvider`: Host mode exposes Host workspace controls, while WSL mode exposes WSL workspace/distribution controls. Because the tool list is constructed from the current per-chat config, irrelevant controls can be omitted rather than merely labeled. Keep status and capability refresh as separate read-only tools so configuration mutations remain explicit.

## Don't Hand-Roll

- Do not add a custom UI framework or new package for conditional settings.
- Do not duplicate WSL detection outside `src/wslCapability.ts`.
- Do not create a second workspace resolver; extend or compose `resolveWorkspaceContext`.
- Do not persist transient capability probes as authoritative state.
- Do not silently convert an invalid workspace to home, plugin data, or process cwd.

## Common Pitfalls

- Treating empty `wslDistribution` as invalid instead of “system default.”
- Conflating global defaults with per-chat active selection.
- Returning a single `available: boolean` that loses actionable WSL failure states.
- Adding settings fields without updating normalization, defaults, tests, and compatibility coverage together.
- Claiming dynamic hide/disable behavior that the installed SDK cannot express.
- Performing path existence checks with Host APIs for WSL-native paths.

## Validation Architecture

- **Unit layer:** `test/workspaceSelection.test.ts`, `test/settings.test.ts`, and `test/wslCapability.test.ts` exercise pure status derivation, backward-compatible normalization, default-distribution semantics, and capability-state codes.
- **Integration layer:** `test/toolsProvider.integration.test.ts` verifies per-chat environment-specific tool registration, contextual status payloads, refresh behavior, and strict no-home-fallback execution blocking.
- **Release layer:** `npm test`, `npm run build`, and `npm run verify:release` remain the final phase gate.
- **Sampling:** run focused Node test-name patterns after each task and the full suite after each plan wave; no new test framework is required.

## Testing Strategy

- Unit-test pure workspace and capability status derivation.
- Extend settings tests for legacy normalization, empty default distribution, advanced override, and separate Host/WSL paths.
- Extend integration tests to assert status responses, environment-specific tool omission, and no-home-fallback behavior.
- Build and release verification remain required.

## Security Review

- Path validity must be checked by the selected backend. [VERIFIED: project requirements]
- Status responses should expose normalized paths and actionable codes but not command outputs or unrelated filesystem content. [VERIFIED: project constraints]
- Capability refresh must not mutate active workspace selection implicitly. [ASSUMED]

## Package Legitimacy Audit

No external packages are required for Phase 4.

## Planning Implications

- Plan 04-01 should establish the typed selection/status model and persistence contract with tests.
- Plan 04-02 should update config schematics and WSL default/override semantics within SDK limits.
- Plan 04-03 should expose runtime workspace/capability status and add integration coverage.
