---
last_mapped_commit: 32a3fb880d150ca331d2a6cebd48a74902b71187
mapped_at: 2026-07-13
focus: arch
---
# Architecture

## Style

The project is a modular host-adapter plugin with one composition root and focused service modules for configuration, persistence, discovery, preprocessing, tools, execution, and bootstrap.

## Composition Root

`src/index.ts` exports `main(context)` and:

1. bootstraps the default skill directory through `src/setup.ts`;
2. registers `src/config.ts` schematics;
3. registers `src/toolsProvider.ts`;
4. registers `src/preprocessor.ts`.

`src/pluginTypes.ts` narrows the LM Studio host surface consumed internally.

## Configuration Layer

`src/config.ts` defines UI fields. `src/settings.ts` merges host configuration with persisted JSON. `src/constants.ts` centralizes defaults, paths, limits, regular expressions, cache timings, and search weights.

## Discovery and Search

`src/scanner.ts` scans roots, reads manifests, extracts descriptions and body excerpts, caches results, installs watchers, builds a weighted BM25-style search index, resolves names, and reads or lists files within skill roots.

## Prompt Transformation

`src/preprocessor.ts` has two flows:

- Explicit activation parses `/skill-name`, resolves skills, and inlines bodies in `<skill_context>`.
- Automatic injection prepends a bounded `<available_skills>` list when skills change or the reinjection interval expires.

Failures are fail-open: the original message is returned.

## Tool Surface

`src/toolsProvider.ts` constructs all host tools. Skill tools delegate to `src/scanner.ts`; general file tools use Node filesystem APIs; commands delegate to `src/executor.ts`.

## Data Flow

User message → preprocessor → effective config → skill scan/cache → explicit or automatic injection → transformed message.

Model tool call → Zod validation → scanner/filesystem/executor → structured LM Studio result.

Host config → settings merge → optional JSON persistence → five-second cache.

## State

- `src/settings.ts`: process-wide effective-config cache.
- `src/scanner.ts`: process-wide skill/search caches and watchers.
- `src/preprocessor.ts`: per-controller injection state in a `Map`.

## Error Strategy

The architecture favors continuity: filesystem failures become empty/null results, preprocessing preserves messages, execution returns structured errors, and settings writes may fail silently.
