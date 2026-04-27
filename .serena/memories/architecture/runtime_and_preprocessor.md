# Runtime and Preprocessor Architecture

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

Prompt preprocessor:
- Implemented in `src/preprocessor.ts`.
- Does not require any user system prompt. It injects plugin context internally before the message reaches the model.
- Uses `PREPROCESSOR_SCAN_TIMEOUT_MS = 3_000` so normal chat responsiveness is protected.
- Full context injection includes:
  - `<skills_runtime_context>`
  - `<available_skills>`
- Compact reminder injection includes:
  - `<skills_runtime_reminder>`
- Full context is injected on first use, when skill fingerprint changes, or after `INTERNAL_CONTEXT_REFRESH_INTERVAL_MS`.
- Intervening turns use a compact reminder to avoid repeatedly growing chat history.
- `Max Skills in Context` caps preprocessor skill gathering and injected skill count.
- If scanning times out or fails non-fatally, the preprocessor falls back to compact reminder rather than blocking the model.
- Real user/LM Studio aborts should be rethrown, not swallowed.

Explicit skill activation:
- Users can write `$skill-name` anywhere in the prompt.
- Supported token form: starts with a letter, then letters/numbers/dot/underscore/hyphen.
- The preprocessor extracts activations with `SKILL_ACTIVATION_PATTERN`.
- For each activation, it calls `resolveSkillByName` directly.
- It injects `<explicit_skill_activation>` with resolved skill name, description, environment, and location.
- The model is steered to treat activated skills as highest-priority source of truth for that request.
- Activated skills are included even if outside normal max skill context limit.
- Explicit activation works even if regular internal context is disabled, because the user directly requested a skill.

Important behavior expectations:
- `$shell-helper-generator` should cause the model to call `read_skill_file("shell-helper-generator")` before doing covered work.
- If an explicit `$skill` token is unresolved, the model is instructed to use `list_skills` with that token name.
- Do not reintroduce mandatory system-prompt setup; README and settings should continue to state no system prompt is required.