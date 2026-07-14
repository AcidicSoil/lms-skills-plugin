# Testing Strategy

**Analysis Date:** 2026-07-14

## Test Framework

- Use Node's built-in `node:test` runner.
- Use `node:assert/strict` for assertions.
- Compile tests with `tsconfig.test.json` before execution.
- `scripts/test.mjs` removes `.test-dist/` before compilation and in a `finally` block afterward.
- Run the complete suite with `npm test`.

## Release Gate

Use `npm run verify:release` before merging or releasing. `scripts/verify-release.mjs`:

1. removes `dist/` and `.test-dist/`;
2. runs `npm test`;
3. runs `npm run build`;
4. checks required JavaScript and declaration artifacts;
5. runs `git diff --check`;
6. rejects tracked file drift.

The release gate must leave `.test-dist/` absent. `dist/` remains ignored and is regenerated locally.

## Test Organization

### Configuration and compatibility

- `test/settings.test.ts` - legacy defaults, invalid values, Host tilde expansion, WSL-native defaults.
- `test/compatibility.test.ts` - Host backward compatibility, public tool names, response fields, persistent command cwd, invalid cwd rejection.

### Path and execution policy

- `test/pathPolicy.test.ts` - path classification, wrong-environment rejection, prefix and canonical escape prevention.
- `test/executor.test.ts` - WSL argv preservation, Host cwd errors, Windows-path rejection in WSL, Bash enforcement.
- `test/wslCapability.test.ts` - unsupported/unavailable/no-distribution/ready capability states.

### Workspace behavior

- `test/workspace.test.ts` - deterministic identity, environment/distribution separation, idempotent roots, capability-before-mutation.
- `test/workspaceFs.test.ts` - Host lifecycle, symlink escape, WSL argv/stdin content safety.

### Skill behavior

- `test/scanner.test.ts` - discovery of child directories containing `SKILL.md`.
- `test/skillStore.test.ts` - WSL `$HOME` resolution, Linux-native roots, reads, and listings.

### Integration and diagnostics

- `test/toolsProvider.integration.test.ts` - Host/WSL workspace sharing, public-tool environment alignment, persistent cwd.
- `test/diagnostics.test.ts` - actionable WSL capability, root-creation, and timeout diagnostics.

## Test Style

- Name tests as complete behavioral statements: `test("WSL rejects Windows cwd instead of translating it", ...)`.
- Test public behavior and security invariants rather than private implementation details.
- Use temporary directories via `fs.promises.mkdtemp()` for Host filesystem tests.
- Always clean temporary directories in `finally` blocks.
- Use injected runners/factories for WSL and platform-specific behavior rather than invoking real WSL in unit tests.
- Record exact argv and stdin in fake runners when shell-safety is the contract.

## Dependency Injection Patterns

Use existing seams rather than monkey-patching globals:

- `ToolsProviderDependencies` in `src/toolsProvider.ts`.
- `WorkspaceDependencies` in `src/workspace.ts`.
- `WorkspaceFsDependencies` and `DirectExecutionRunner` in `src/workspaceFs.ts`.
- `ProgramRunner` in `src/wslCapability.ts`.
- `execProgram` injection in `createSkillStore()`.

New external boundaries should expose a similarly narrow injected dependency.

## Required Coverage for New Features

### New public tool

- Add the name to `PUBLIC_TOOL_NAMES`.
- Update `test/compatibility.test.ts`.
- Add Host behavior coverage.
- Add WSL behavior or injected WSL coverage.
- Add the tool to the all-public-tools environment alignment test.
- Test containment and wrong-environment input.

### New filesystem operation

- Test normal Host lifecycle.
- Test WSL program/argv/stdin behavior.
- Test traversal and canonical escape.
- Test missing source and existing destination behavior where applicable.
- Test workspace-root protection.

### New setting

- Test missing legacy value.
- Test valid value.
- Test invalid persisted/live value.
- Test Host/WSL-specific defaults and path interpretation.

### New process behavior

- Test exact `ExecutionSpec` program and argv.
- Test timeout and output limits.
- Test shell/environment separation.
- Test actionable missing-runtime errors.

## Assertions

- Use `assert.equal()` for scalar fields.
- Use `assert.deepEqual()` for argv, tool-name arrays, and structured outputs.
- Use `assert.match()` for contextual error messages while avoiding brittle full-string equality.
- Use `assert.rejects()` for service-layer failures.
- Avoid snapshot tests for public tool objects; assert stable required fields only.

## Manual Validation

Automated tests do not replace real platform validation. Use `docs/release-checklist.md` for:

- Windows Host workflow;
- real Ubuntu/WSL workflow;
- skill-boundary behavior;
- timeout and containment evidence;
- environment metadata.

Manual reports must distinguish PASS, FAIL, and BLOCKED. Interpret evidence from actual tool output rather than trusting a generated verdict label.

## Current Coverage Shape

- 29 test cases across 11 files.
- Strong coverage of path policy, execution specification, workspace lifecycle, WSL skill access, tool integration, and diagnostics.
- No configured coverage-percentage tool or threshold.
- No repository CI workflow detected; local release verification is therefore critical.

## Commands

```bash
npm test
npm run build
npm run verify:release
```

Run `npm run verify:release` from a clean tracked working tree because tracked changes intentionally cause it to fail.

---

*Testing analysis: 2026-07-14*
