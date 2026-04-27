# Runtime, Router, and Preprocessor Architecture

Runtime model:
- Runtime environment types live in `src/environment.ts`:
  - `SkillsEnvironment`: `windows`, `wsl`, `both`.
  - `RuntimeTargetName`: `windows`, `wsl`.
- `deriveRuntimeTargets` converts config mode into runtime targets.
- `src/runtime/types.ts` defines the `RuntimeAdapter` interface:
  - `expandPath`, `exists`, `stat`, `readFile`, `readDir`, `exec`.
  - Most methods accept optional `AbortSignal`.
- `src/runtime/windowsRuntime.ts` implements native Windows path/filesystem/shell behavior.
- `src/runtime/wslRuntime.ts` implements WSL/Linux behavior. On Linux host it uses Node `fs` directly for filesystem operations; on Windows host it shells through WSL where needed.
- `src/runtime/index.ts` creates a registry with Windows and WSL adapters based on effective config.
- `src/pathResolver.ts` resolves configured raw skills paths into environment-aware roots with labels like `WSL:/path` or `Windows:C:\...`.

Skill metadata and frontmatter:
- `src/scanner.ts` parses Claude-style YAML frontmatter at the top of `SKILL.md`.
- Parsed frontmatter fields include `name`, `description`, `when_to_use` / `when-to-use`, `tags`, `disable-model-invocation`, `user-invocable`, and several extra Claude-style fields.
- Frontmatter is used for high-level routing metadata.
- `readSkillFile` strips frontmatter when returning `SKILL.md` content.
- `disable-model-invocation: true` excludes a skill from automatic routing but does not block explicit `$skill-name` activation.

Deterministic router:
- Implemented in `src/skillRouter.ts`.
- Normal prompt injection should not expose broad skill catalogs.
- `routeSkills(query, skills, maxSelected)` scores metadata only:
  - exact skill name match,
  - exact directory basename match,
  - name phrase/token overlap,
  - description/when_to_use phrase/token overlap,
  - tag exact matches,
  - directory/path token matches,
  - generic-description penalty.
- Router returns selected/rejected candidates with score, confidence, reasons, and source.
- Prompt injection caps routed candidates at `DEFAULT_MAX_ROUTED_SKILLS = 3`.
- `Max Skills in Context` remains an upper bound for discovery work, not a broad injection count.
- `list_skills({ query, mode: "route" })` uses the same router for testability.

Prompt preprocessor:
- Implemented in `src/preprocessor.ts`.
- Does not require any user system prompt. It injects plugin context internally before the message reaches the model.
- Uses `PREPROCESSOR_SCAN_TIMEOUT_MS = 3_000` so normal chat responsiveness is protected.
- Normal prompt path:
  - resolve configured roots,
  - scan metadata/frontmatter up to the discovery limit,
  - run deterministic router,
  - inject `<routed_skills>` only when there is a confident route,
  - inject compact `<skills_runtime_reminder>` when no route is confident.
- Normal routed candidates use progressive disclosure: model sees metadata/reason/location and then calls `read_skill_file` before covered work.
- Full `SKILL.md` bodies are not injected for normal routed candidates.
- If routing times out or fails non-fatally, the preprocessor falls back to compact reminder rather than blocking the model.
- Real user/LM Studio aborts should be rethrown, not swallowed.

Explicit skill expansion:
- Users can write `$skill-name` anywhere in the prompt.
- Supported token form: starts with a letter, then letters/numbers/dot/underscore/hyphen.
- The preprocessor extracts activations with `SKILL_ACTIVATION_PATTERN`.
- For each activation, it calls `resolveSkillByName` directly.
- If resolved, the preprocessor calls `readSkillFile` internally and injects the stripped `SKILL.md` body inside `<expanded_skill_instructions>` under `<explicit_skill_activation>` before the model starts reasoning.
- Explicit activation does not route supplemental skills first. It expands only the explicitly requested skill(s).
- The model-facing instruction says the expanded skill is highest-priority source of truth and all remaining user text is task payload.
- If expansion fails, the activation block includes `<expanded_skill_instructions_error>` and the model should call `read_skill_file`.
- If unresolved, the model is instructed to call `list_skills` with the token name.
- Explicit activation works even if regular internal context is disabled.
- Explicit activation can use skills marked `disable-model-invocation: true` because the user directly requested them.

Important behavior expectations:
- `$create-plan` should expand the matching `create-plan/SKILL.md` body before model reasoning.
- `$example-skill` should not cause the model to interpret backticked command-looking payload before applying the expanded skill.
- Normal queries should not inject more than three routed candidates.
- Casual/unrelated messages should receive only a compact reminder or no meaningful skill context.
- Do not reintroduce mandatory system-prompt setup.
- Do not reintroduce broad `<available_skills>` dumping as the default model context.