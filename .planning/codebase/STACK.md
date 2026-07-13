---
last_mapped_commit: 32a3fb880d150ca331d2a6cebd48a74902b71187
mapped_at: 2026-07-13
focus: tech
---
# Technology Stack

## Overview

`lms-plugin-skills` is a Node.js LM Studio plugin written in strict TypeScript. It discovers Claude-style skill directories, injects skill metadata or activated skill bodies into prompts, and exposes local tools through the LM Studio SDK.

## Languages and Runtime

- TypeScript is authoritative under `src/`.
- ES2022 is the compiler target.
- CommonJS is the emitted module format.
- Node.js is the plugin runner in `manifest.json`.
- Node 20 declarations come from `@types/node`.

## Frameworks and Libraries

- `@lmstudio/sdk` supplies plugin registration, configuration, and tool definitions.
- `zod` validates model-facing tool parameters in `src/toolsProvider.ts`.
- Node built-ins (`fs`, `path`, `os`, `child_process`) implement local integration.

## Build and Packaging

- `npm run build` runs `tsc`.
- `npm run dev` compiles and launches `lms dev`.
- `npm run push` delegates to `lms push`.
- `dist/` contains JavaScript, declarations, declaration maps, and source maps.
- `package.json` points to `dist/index.js`.
- `manifest.json` identifies owner `khtsly`, plugin `skills`, revision 13.

## Compiler Policy

`tsconfig.json` enables strict checking, casing consistency, JSON modules, interoperability, declarations, and source maps. Dependency declaration checking is skipped with `skipLibCheck`.

## Runtime Configuration

`src/config.ts` defines `autoInject`, `maxSkillsInContext`, `skillsPath`, `shellPath`, and `windowsShell`. Bounds and defaults live in `src/constants.ts`; persistent resolution lives in `src/settings.ts`.

## Repository Artifacts

- `src/`: source modules.
- `dist/`: generated output.
- `samples/`: starter skills.
- `.lmstudio/`: local development entry files.
- `README.md`: user documentation.
