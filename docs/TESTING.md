<!-- generated-by: gsd-doc-writer -->
# Testing

## Test Framework and Setup

Tests use Node.js's built-in `node:test` framework and `node:assert/strict`. TypeScript test sources are compiled with `tsconfig.test.json` before execution.

Install dependencies first:

```bash
npm install
```

No external database, service, browser, or network fixture is required by the automated suite.

## Running Tests

Run the complete suite:

```bash
npm test
```

The cross-platform runner in `scripts/test.mjs`:

1. removes `.test-dist`;
2. compiles source and tests with `tsconfig.test.json`;
3. runs every compiled `*.test.js` file with `node --test`;
4. removes `.test-dist` in a `finally` block, including after failures.

Run the full release gate:

```bash
npm run verify:release
```

Run a compiled subset manually when investigating a failure:

```bash
npx tsc -p tsconfig.test.json
node --test .test-dist/test/executor.test.js
rm -rf .test-dist
```

The final cleanup command above is POSIX-specific; the normal `npm test` command is cross-platform and preferred.

## Test Suites

| File | Primary coverage |
|---|---|
| `test/settings.test.ts` | Defaults, persistence normalization, environment-aware skill roots |
| `test/wslCapability.test.ts` | WSL availability and distribution detection |
| `test/pathPolicy.test.ts` | Path classification, translation rules, and containment |
| `test/executor.test.ts` | Host shells, WSL Bash, timeouts, and output handling |
| `test/workspace.test.ts` | Deterministic workspace identity and lifecycle |
| `test/workspaceFs.test.ts` | Host/WSL file operations and canonical containment |
| `test/scanner.test.ts` | Child skill discovery |
| `test/skillStore.test.ts` | Environment-aware WSL skill roots, reads, and listings |
| `test/toolsProvider.integration.test.ts` | Public tool routing and environment alignment |
| `test/compatibility.test.ts` | Host defaults and public tool compatibility |
| `test/diagnostics.test.ts` | Actionable failure propagation |

## Writing New Tests

- Place tests in `test/` with the suffix `.test.ts`.
- Use dependency injection already exposed by executors, workspace resolvers, filesystem backends, skill stores, and the tools provider.
- Prefer deterministic fake process or filesystem adapters over invoking a real WSL installation in unit tests.
- Add an integration assertion when a change affects more than one public tool.
- For environment-sensitive features, cover Host and WSL behavior and assert that no path from the wrong environment leaks into results.
- Clean temporary directories with `try/finally` or test teardown.

## Coverage Requirements

No line, branch, function, or statement coverage threshold is configured. Release confidence is based on behavioral test coverage, strict compilation, generated-artifact checks, and documented real Host/WSL smoke tests.

## CI Integration

No `.github/workflows` test workflow is present in the repository. The authoritative local release command is:

```bash
npm run verify:release
```

## Manual Release Validation

Use [release-checklist.md](release-checklist.md) for real Windows Host and WSL validation. Mocks do not replace the manual release gate for environment integration.
