<!-- generated-by: gsd-doc-writer -->
# Development

## Local Setup

```bash
git clone https://github.com/AcidicSoil/lms-skills-plugin.git
cd lms-skills-plugin
npm install
npm run build
```

Use `npm install` for an editable local checkout. Generated JavaScript and declarations are written to `dist/` and should not be edited directly.

## Build Commands

| Command | Description |
|---|---|
| `npm run build` | Compile strict TypeScript from `src/` into `dist/` |
| `npm run dev` | Compile and start `lms dev` |
| `npm run push` | Run `lms push` |
| `npm test` | Compile tests into `.test-dist`, run Node's test runner, and clean test output |
| `npm run verify:release` | Clean outputs, test, build, check required artifacts, and reject tracked drift |

## Source Organization

- Keep LM Studio registration in `src/index.ts`.
- Keep configuration schema and persistence in `src/config.ts` and `src/settings.ts`.
- Route environment-sensitive skill access through `src/skillStore.ts`.
- Route project file access through `src/workspaceFs.ts`.
- Route command and direct-process execution through `src/executor.ts`.
- Enforce path semantics in `src/pathPolicy.ts` rather than ad hoc string manipulation.

## Code Style

The project uses strict TypeScript with:

- target `ES2022`;
- CommonJS modules;
- `strict: true`;
- declaration and source-map generation;
- two-space indentation in existing source;
- semicolons and double-quoted strings.

No ESLint, Prettier, Biome, or `.editorconfig` configuration is present. Use the existing codebase conventions and validate with:

```bash
npm run build
git diff --check
```

## Environment Rules

Changes must preserve these invariants:

- Host is the compatibility default.
- WSL uses Linux-native paths and `/bin/bash` in the selected distribution.
- Windows Host shell choice does not affect WSL.
- Every environment-sensitive tool follows the selected environment.
- Project paths stay inside the deterministic workspace after lexical and canonical checks.
- Skill roots remain separate from project workspace roots.
- No silent Host/WSL fallback or implicit path translation is allowed.

## Adding a Tool

1. Add the tool name to `PUBLIC_TOOL_NAMES` in `src/toolsProvider.ts`.
2. Define its Zod parameters and implementation in the tools provider.
3. Reuse `SkillStore`, `WorkspaceFileSystem`, or the executor rather than bypassing environment policy.
4. Add Host and WSL integration coverage.
5. Update README and configuration or workspace docs when user-visible behavior changes.

## Branch Conventions

The default branch is `main`. No permanent branch-naming convention is documented in the repository. Use a short descriptive branch name and avoid committing generated `dist/` or `.test-dist/` output.

## Pull Request Process

1. Keep the change focused and include tests for behavior changes.
2. Run `npm run verify:release` from a clean tracked tree.
3. Update documentation for user-visible settings, tools, paths, or shell behavior.
4. Describe Host and WSL impact explicitly when the change is environment-sensitive.
5. Submit the pull request against `main`.
