# External Integrations

**Analysis Date:** 2026-07-14

## APIs & External Services

**LM Studio:**
- LM Studio plugin runtime is the primary external integration.
  - SDK/Client: `@lmstudio/sdk`.
  - Registration: `.lmstudio/entry.ts` creates `LMStudioClient` and a `PluginContext`.
  - Plugin hooks: `src/index.ts` registers configuration, tools, and prompt preprocessing.
  - Runtime credentials: `LMS_PLUGIN_CLIENT_IDENTIFIER`, `LMS_PLUGIN_CLIENT_PASSKEY`, and `LMS_PLUGIN_BASE_URL` are consumed by `.lmstudio/entry.ts`.

**Windows Subsystem for Linux:**
- `wsl.exe` is invoked directly for capability detection and Linux-native operations.
  - Capability probing: `src/wslCapability.ts`.
  - Command execution: `src/executor.ts`.
  - Workspace creation: `src/workspace.ts`.
  - File operations: `src/workspaceFs.ts`.
  - Skill operations: `src/skillStore.ts`.

## Data Storage

**Databases:**
- None.

**File Storage:**
- Persisted plugin settings: `~/.lmstudio/plugin-data/lms-skills/settings.json` through `src/settings.ts`.
- Host workspaces: `~/.lmstudio/plugin-data/lms-skills/workspaces/<id>`.
- WSL workspaces: `~/.lmstudio/lms-skills/workspaces/<id>` inside the selected distribution.
- Skill roots: configurable Host or WSL-native directories, resolved by `src/settings.ts` and `src/skillStore.ts`.

**Caching:**
- In-process configuration cache with a five-second TTL in `src/settings.ts`.
- In-process skill scan/search caches in `src/scanner.ts`.
- Per-tools-provider lazy workspace, filesystem, skill-store, and active-command-directory state in `src/toolsProvider.ts`.

## Authentication & Identity

**LM Studio plugin identity:**
- Runtime client identifier/passkey are injected by LM Studio into `.lmstudio/entry.ts`.
- No application-level user authentication exists.

**Workspace identity:**
- Deterministic SHA-256 workspace IDs derive from provider working directory, environment, and WSL distribution in `src/workspace.ts`.

## Monitoring & Observability

**Error Tracking:**
- No external error-tracking service.

**Logs and diagnostics:**
- Tool implementations return structured success/error objects.
- `run_command` returns stdout, stderr, exit code, timeout state, shell, platform, environment, workspace ID, and root.
- WSL capability states are explicit discriminated results in `src/wslCapability.ts`.
- LM Studio startup failures are written to `console.error` by `.lmstudio/entry.ts`.

## CI/CD & Deployment

**Hosting:**
- Installed and executed as an LM Studio plugin.

**CI Pipeline:**
- No repository-hosted CI workflow detected.
- Local release gate is `npm run verify:release`.
- Git hooks may run additional checks, but repository correctness must not depend solely on local hooks.

**Publishing:**
- `npm run push` invokes `lms push`.
- `manifest.json` declares plugin owner, name, runner, and revision.

## Environment Configuration

**Runtime variables:**
- `LMS_PLUGIN_CLIENT_IDENTIFIER`
- `LMS_PLUGIN_CLIENT_PASSKEY`
- `LMS_PLUGIN_BASE_URL`

**User settings:**
- `autoInject`
- `maxSkillsInContext`
- `skillsPath`
- `executionEnvironment`
- `wslDistribution`
- `shellPath`
- `windowsShell`

**Secrets location:**
- LM Studio supplies runtime plugin credentials. Do not persist or log them from application code.

## Webhooks & Callbacks

**Incoming:**
- LM Studio prompt-preprocessor callback.
- LM Studio tools-provider callback.
- LM Studio configuration callback.

**Outgoing:**
- No HTTP webhooks.
- Child-process calls to Host shells and `wsl.exe` are the only external execution boundary.

---

*Integration audit: 2026-07-14*
