---
last_mapped_commit: 32a3fb880d150ca331d2a6cebd48a74902b71187
mapped_at: 2026-07-13
focus: arch
---
# Repository Structure

## Top-Level Layout

```text
.
├── src/          TypeScript source
├── dist/         Generated runtime and declarations
├── samples/      Starter skills
├── docs/         Supplemental documentation
├── .lmstudio/    Local development integration
├── package.json
├── manifest.json
├── tsconfig.json
├── README.md
└── todo.md       Future host/WSL workspace design
```

Operational directories `.serena`, `.codex`, `.agents`, and `skills` are excluded from this product map under `AGENTS.md`.

## Source Modules

- `src/index.ts`: composition root.
- `src/config.ts`: configuration schema.
- `src/constants.ts`: shared policies and limits.
- `src/pluginTypes.ts`: host interfaces.
- `src/types.ts`: domain and settings interfaces.
- `src/settings.ts`: persistent/effective configuration.
- `src/scanner.ts`: discovery, metadata, search, safe skill access.
- `src/preprocessor.ts`: prompt injection and explicit activation.
- `src/toolsProvider.ts`: all tool definitions.
- `src/executor.ts`: cross-platform shell execution.
- `src/setup.ts`: initial skill-directory bootstrap.

## Generated Output

Every `src/*.ts` module has corresponding `.js`, `.d.ts`, `.js.map`, and `.d.ts.map` files under `dist/`. Edit source, then regenerate with `npm run build`; do not hand-edit `dist/`.

## Samples

`samples/` contains `code-review`, `data-analysis`, `git-commit`, and `markdown-report`. Each has `SKILL.md` and `skill.json`; some include supporting files.

## Naming

Source files use lower camel case. Interfaces use PascalCase. Constants use upper snake case. Host tool names use lower snake case such as `read_skill_file` and `run_command`.

## Dependency Direction

`src/index.ts` depends on setup/config/tools/preprocessor. Lower-level modules depend on constants, types, scanner, settings, and executor; observed source has no circular dependency back to the composition root.
