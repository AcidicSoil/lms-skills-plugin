# Skill Discovery Failure Evidence — 2026-05-01

Source evidence:
- Uploaded export: `Skill Discovery Failure - 2026-05-01 23.54.md`.

Observed failure:
- User asked for a prompt-crafting skill.
- Model called `list_skills` with `query: "crafting prompts"`, then `query: "prompts"` twice.
- Each call returned `success: false`, `timedOut: true`, `recovered: true`, and elapsed around 20,001–20,002 ms.
- The assistant incorrectly told the user no prompt skills were found, even though the tool result was a timeout/recovery result, not a `found: 0` search result.

Required behavior:
- A `list_skills` timeout must be treated as discovery failure, not as an empty catalog result.
- The model-facing recovery result should explicitly say the timeout is not evidence that no matching skill exists.
- The recovery path should recommend a narrower deterministic retry such as `list_skills({ query, mode: "route", limit: 10 })` and, if needed, `search_skill_roots` or `list_skill_roots`.
- Skill-listing recovery timeout should stay within the 5–15 second bound from the implementation-ready specification rather than waiting 20 seconds or longer.

Implementation notes:
- `src/toolsProvider.ts` now uses `LIST_SKILLS_RECOVERY_TIMEOUT_MS = 10_000` and a list-skills-specific recovery payload with `found: null`, `recommendedRecovery`, fallback tools, and final-answer guidance.
- Follow-up export evidence showed `search_skill_roots` successfully finding `CUSTOMS/prompt-workflow-curator/SKILL.md`, after which the model incorrectly called `read_skill_file` with both `skill_name: "CUSTOMS/prompt-workflow-curator"` and `file_path: "CUSTOMS/prompt-workflow-curator/SKILL.md"`.
- `search_skill_roots` and `list_skill_roots` now return `readSkillFileArgs` / `readSkillFileDisplayPathArgs` for each discovered `SKILL.md` entrypoint, plus guidance to omit `file_path` when reading entrypoints.
- `read_skill_file` now normalizes the common duplicated `SKILL.md` follow-up shape and `resolveSkillByName` can resolve root-relative skill directories before broad scans.
- A later export showed the model still stopped after the improved timeout payload and asked the user whether to continue. The recovery payload now includes `nextToolCall.required`, explicit "call this tool now" instructions, `fallbackToolCall`, and a final-answer prohibition so a timeout cannot be treated as a stopping point.
- User correctly noted qmd/ck would have returned matches in these scenarios. Skill Search Backend now defaults to `auto`, timeout recovery retries small query search instead of route-only, and non-builtin search uses plugin-controlled qmd/ck before slow built-in scans.
- Another export showed a no-query `list_skills` timeout after finding `python`; the model incorrectly concluded only `python` existed. No-query timeout recovery now makes `search_skill_roots({ pattern: "SKILL.md" })` the required next call and explicitly forbids inferring total skill count from timeout.
- The same export showed `searchBackend.requested: "qmd"` with `active: "builtin"` for an exact `python` match. That was not qmd fallback; exact-match short-circuit skipped enhanced search. Follow-up analysis showed this was still too narrow: normal search mode should not settle on the exact `python` skill without considering other Python-related skills. Exact matches are now included first, but normal search continues through enhanced qmd/ck and built-in discovery; metadata uses `resolutionStage: "exact_match_plus_broader_search"`.
- Another export showed the model using an over-specific fallback root-search phrase (`writing prompts`) and stopping after no matches. `search_skill_roots` now expands plain-language phrase patterns into token and singular variants so `writing prompts` can still match prompt-related skill paths; `fallbackToolCall` also prefers prompt-related tokens over generic writing/crafting terms.
