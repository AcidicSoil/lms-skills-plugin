# Technology Stack

**Analysis Date:** 2026-07-14

## Languages

**Primary:**
- TypeScript 5.4+ - all plugin implementation under `src/` and tests under `test/`.

**Secondary:**
- JavaScript ES modules - test and release runners in `scripts/test.mjs` and `scripts/verify-release.mjs`.
- JSON - `package.json`, `manifest.json`, and LM Studio/plugin metadata.
- Markdown - user documentation, sample skills, and GSD planning artifacts.

## Runtime

**Environment:**
- Node.js 20-compatible runtime, implied by `@types/node` 20 and ES2022 target.
- LM Studio plugin runtime via `.lmstudio/entry.ts` and `@lmstudio/sdk`.
- Optional Windows Subsystem for Linux runtime through `wsl.exe`.

**Package Manager:**
- npm with `package-lock.json` present.
- Use `npm install`, `npm test`, `npm run build`, and `npm run verify:release`.

## Frameworks

**Core:**
- `@lmstudio/sdk` `^1.5.0` - plugin registration, configuration schematics, prompt preprocessing, and tool definitions.
- `zod` `^3.25.76` - runtime validation for tool parameters in `src/toolsProvider.ts`.

**Testing:**
- Node built-in `node:test` and `node:assert/strict` - no Jest/Vitest dependency.
- TypeScript test compilation through `tsconfig.test.json` into temporary `.test-dist/`.

**Build/Dev:**
- TypeScript compiler (`tsc`) targeting ES2022 and CommonJS.
- `lms dev` for LM Studio development after TypeScript compilation.
- `lms push` for plugin publishing workflow.

## Key Dependencies

**Critical:**
- `@lmstudio/sdk` - defines the plugin contract consumed in `src/config.ts`, `src/index.ts`, and `src/toolsProvider.ts`.
- `zod` - defines public tool schemas and parameter bounds.

**Platform APIs:**
- Node `fs`, `path`, `os`, `crypto`, and `child_process` - filesystem, workspace identity, shell execution, and WSL capability detection.
- Windows `wsl.exe` - WSL capability checks and Linux-native operations.
- Linux coreutils in WSL - `find`, `cat`, `mv`, `rm`, `realpath`, `test`, `printenv`, and `/bin/bash`.

## Configuration

**Environment:**
- Plugin settings are defined in `src/config.ts` and persisted by `src/settings.ts`.
- Supported execution environments are `host` and `wsl`.
- Windows Host shells are `cmd`, `powershell`, `git-bash`, or an explicit shell path.
- WSL always uses `/bin/bash` inside the selected distribution.

**Build:**
- `tsconfig.json` compiles `src/**/*` to `dist/` with declarations and source maps.
- `tsconfig.test.json` extends the main config and compiles `src/**/*` plus `test/**/*` to `.test-dist/`.
- `scripts/test.mjs` cleans `.test-dist/` before and after tests.
- `scripts/verify-release.mjs` cleans generated output, runs tests/build, verifies artifacts, and checks Git drift.

## Platform Requirements

**Development:**
- Node.js and npm.
- LM Studio CLI for `npm run dev` and `npm run push`.
- Windows plus WSL only when validating WSL behavior on real hardware.

**Production:**
- LM Studio plugin host.
- Host execution works on Windows, macOS, and Linux.
- WSL execution is Windows-only and requires an initialized distribution with Bash and common coreutils.

---

*Stack analysis: 2026-07-14*
