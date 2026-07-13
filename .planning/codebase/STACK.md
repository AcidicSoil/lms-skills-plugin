---
mapped_at: 2026-07-13
focus: tech
---

# Technology Stack

## Overview

`lms-plugin-skills` is a Node.js/TypeScript plugin for LM Studio. It discovers Claude-style skill directories, injects skill metadata into prompts, and exposes filesystem and command-execution tools to models.

## Languages and Runtime

- TypeScript is the authored application language under `src/`.
- The runtime is Node.js, declared by `manifest.json` with `"runner": "node"`.
- The compiler targets ES2022 and emits CommonJS modules through `tsconfig.json`.
- Generated JavaScript, declarations, source maps, and declaration maps are emitted to `dist/`.
- Node type definitions are supplied through `@types/node` in `package.json`.

## Core Dependencies

- `@lmstudio/sdk` supplies plugin registration, configuration schematics, tools, and the LM Studio client.
- `zod` defines and validates tool parameter schemas in `src/toolsProvider.ts`.
- TypeScript is the only build-time compiler.
- No application framework, database client, web server, or UI framework is present.

## Build and Development

- `npm run build` invokes `tsc`.
- `npm run dev` compiles then starts `lms dev`.
- `npm run push` publishes through `lms push`.
- `.lmstudio/entry.ts` is the LM Studio development/runtime bootstrap.
- `src/index.ts` is the authored plugin entry point.

## TypeScript Configuration

- Strict type checking is enabled in `tsconfig.json`.
- `esModuleInterop`, `resolveJsonModule`, and `forceConsistentCasingInFileNames` are enabled.
- Library checking is skipped with `skipLibCheck`.
- Only `src/**/*` is compiled; `node_modules` and `dist` are excluded.

## Runtime Configuration

- User-facing fields are defined in `src/config.ts`.
- Effective configuration is merged and persisted by `src/settings.ts`.
- Persistent settings live at `~/.lmstudio/plugin-data/lms-skills/settings.json` via `src/constants.ts`.
- Skill directories default to `~/.lmstudio/skills`.
- Multiple skill directories are represented as a semicolon-separated string.

## Packaging

- Package metadata lives in `package.json` and identifies version `1.0.7`.
- LM Studio plugin identity lives in `manifest.json` as owner `khtsly`, name `skills`, revision `13`.
- The public package entry is `dist/index.js`.
- The project uses Apache-2.0 licensing through `LICENSE` and `package.json`.
