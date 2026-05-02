# Runtime Tooling Requirements Memory

Source evidence:
- Raw captured prompt/spec: `.serena/memories/Optimizing Skills Plugin Query.md`.
- Implementation/docs touched in the current runtime-tooling slice: `src/runtime/types.ts`, `src/runtime/windowsRuntime.ts`, `src/runtime/wslRuntime.ts`, `src/scanner.ts`, `src/toolSchemas.ts`, `src/toolsProvider.ts`, `src/constants.ts`, `README.md`, `tests/toolsProvider.test.js`, `tests/source.test.js`.

Durable requirements captured from the raw doc:
- The plugin should act as a complete skills runtime, not only a skill metadata loader.
- Skills should be actionable through model-callable tools for reading files, writing/editing/creating files, running scripts or shell commands, inspecting outputs/logs/errors, and chaining tool calls.
- User prompts should route to useful skills even without explicit skill names or `$skill-name` activation when repository evidence supports a confident match.
- Tool calls should be observable: tool name, summarized input, elapsed time, success/failure, timeout/recovery status, errors, hints, and routing context should be logged automatically.
- Tool calls should be bounded by reasonable timeout/recovery behavior; broad `list_skills` calls should not run for excessive durations without returning a recovery path.
- Retrieval/ranking should avoid first-match-only behavior; routed candidates should include relevance/confidence/reason metadata and safe fallback behavior.

Current implementation state:
- Runtime adapters expose read/write primitives; Windows and WSL runtimes implement `writeFile`.
- `read_file`, `write_file`, and `edit_file` tools are exposed by `src/toolsProvider.ts`.
- Filesystem tools are bounded to configured skill roots through helpers in `src/scanner.ts`.
- Mutating filesystem tools require `commandExecutionMode: "guarded"`.
- `run_command` already provides guarded command/script execution and remains disabled by default.
- File-operation schemas live in `src/toolSchemas.ts`; content/edit size is checked by UTF-8 byte length and edit text supports normal multiline content.
- Tool operation timeout constant: `TOOL_FILE_OPERATION_TIMEOUT_MS = 30_000`.
- Automated validation exists through `npm test`, which runs build plus Node test files.

Observed skill-discovery failure evidence:
- Uploaded export `Skill Discovery Failure - 2026-05-01 23.54.md` shows `google/gemma-4-e2b` repeatedly calling `list_skills` for `crafting prompts` / `prompts`, receiving `timedOut: true` recovery results around 20 seconds, then incorrectly telling the user no prompt-related skills existed.
- The corrective behavior is: timeout is not an empty result; model-facing recovery should say to retry with `mode='route'` or inspect roots, and the implementation should return cheap exact/fuzzy metadata matches before slower enhanced/full-text search.
- Regression fixture now includes `prompt-engineering`; `list_skills({ query: "prompts" })` must return that candidate in fuzzy mode before enhanced backend work.
- Follow-up failure evidence showed the model misusing a discovered root-relative `SKILL.md` path as `read_skill_file.file_path`. Root search results should include `readSkillFileArgs` and `read_skill_file` should normalize deterministic duplicated entrypoint paths.
- Additional failure evidence showed the model asking the user whether to continue after a timeout despite `recommendedRecovery`. Timeout payloads should include an explicit `nextToolCall` with `required: true`, a `fallbackToolCall`, and guidance that a final answer is prohibited until recovery/inspection is attempted.
- qmd/ck enhanced search should be available through `list_skills`, not raw model-issued shell commands. Default backend is `auto`; non-builtin query search should try plugin-controlled qmd/ck before slow built-in filesystem scans, then fall back safely. Users can configure qmd/ck executable names or absolute paths through visible `QMD Binary` and `CK Binary` settings when the plugin process PATH cannot find them.
- No-query `list_skills` timeouts are not catalog-size evidence. Recovery should inspect `SKILL.md` entrypoints with `search_skill_roots` instead of retrying the same broad listing or claiming only previously found skills exist.
- Exact skill-name matches in normal search mode are not sufficient discovery evidence. Include the exact match first, but continue through enhanced qmd/ck and built-in discovery so related skills are not suppressed.
- Root-search matches that are support directories/files inside a parent skill are not skill names. `search_skill_roots` should surface a `parentSkill` object with copyable `listSkillFilesArgs` / `readSkillFileArgs` so the model uses the parent skill and relative sub_path/file_path.
- Timeout recovery payloads need to be self-contained enough for weaker models: include `recoveryPlan`, `recoveryRequired`, and `invalidFinalAnswerIf`, and explicitly forbid general-knowledge answers before skill-catalog recovery has been attempted.
- Later failure evidence showed phrase fallback (`writing prompts`) returning no root matches despite prompt skills existing. Root search should expand non-glob phrases into token/singular variants, and fallback pattern selection should prefer `prompt` over generic `writing`/`crafting` tokens.

Remaining validation gaps:
- Successful guarded `write_file` / `edit_file` paths should get focused automated tests or manual LM Studio smoke tests.
- Windows-hosted WSL write behavior should be manually tested in the real LM Studio/WSL environment.
- The raw prompt/spec memory is intentionally preserved as evidence; this file is the concise operational memory to load first.
