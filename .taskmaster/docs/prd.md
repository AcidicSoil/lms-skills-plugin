# PRD: Environment-Aware Skills Runtime for Windows/WSL

Source baseline: the current snapshot has a single `skillsPath` setting, optional `shellPath`, native `fs`-based skill scanning, and shell auto-detection that prefers PowerShell/cmd on Windows and bash/sh on Unix-like hosts. This confirms the reported mismatch: skill path resolution, filesystem inspection, and command execution are currently host-platform-driven rather than target-environment-driven.

---

## 1) Overview

### Problem Statement

The plugin resolves skill paths and executes commands according to the host OS, not the user’s intended skills runtime environment.

On Windows hosts, a configured path such as:

```txt
~/.agents/skills
```

is ambiguous. It may refer to either:

```txt
C:\Users\<user>\.agents\skills
```

or:

```txt
/home/<wsl-user>/.agents/skills
```

The current implementation treats `~` and shell execution as native host concerns. On Windows, this means skills intended to live in WSL can be resolved through Windows path semantics and commands can be routed to PowerShell instead of bash. The result is failed skill discovery, incorrect filesystem checks, invalid command syntax, and model self-correction loops.

### Target Users

1. **Windows users with WSL-based agent/skill directories**

   * Store skills under Linux paths such as `~/.agents/skills`.
   * Expect Linux shell commands, Linux path expansion, and WSL filesystem discovery.

2. **Windows-only users**

   * Store skills under Windows profile paths.
   * Expect PowerShell/cmd-compatible execution.

3. **Mixed-environment users**

   * Maintain both Windows and WSL skill directories.
   * Need skill discovery across both without mixing shell semantics.

4. **Model/tool users**

   * Rely on `list_skills`, `read_skill_file`, `list_skill_files`, and `run_command`.
   * Need tool output to state which environment and shell were used.

### Success Metrics

* **WSL path correctness**: With environment set to `WSL` and path `~/.agents/skills`, `~` resolves to WSL `$HOME`, not Windows `%USERPROFILE%`.
* **Skill discovery correctness**: WSL-side `SKILL.md` files are discoverable without requiring mirrored Windows paths.
* **Shell correctness**: Linux commands are never sent directly to PowerShell.
* **Windows preservation**: Existing Windows-only behavior remains functional when `Windows` is selected.
* **Both-mode isolation**: `Both` mode searches Windows and WSL separately and labels each result with its environment.
* **Tool transparency**: Tool responses include environment, shell, and resolved path metadata.
* **Backward compatibility**: Existing configs without an explicit environment continue to work using a safe default.

### MVP Definition

The MVP is the smallest usable end-to-end path:

> A Windows user selects `WSL`, configures `~/.agents/skills`, runs `list_skills`, sees WSL-side skills, reads `SKILL.md`, and executes bash-compatible commands through WSL with environment metadata in tool output.

---

## 2) Capability Tree — Functional Decomposition

### Capability: Runtime Environment Selection

Defines which environment owns skills path resolution, filesystem inspection, and command execution.

#### Feature: Environment mode configuration — **MVP core**

* **Description**: Allow users to select `Windows`, `WSL`, or `Both` for skills runtime behavior.
* **Inputs**:

  * Plugin config value: `skillsEnvironment`
  * Existing config values: `skillsPath`, `shellPath`, `autoInject`, `maxSkillsInContext`
* **Outputs**:

  * Effective runtime mode: `windows | wsl | both`
  * Persisted setting in plugin settings file
* **Behavior**:

  * Reads selected environment mode from config.
  * Falls back to persisted setting when config is empty.
  * Defaults to `Windows` on Windows hosts for backward compatibility.
  * Defaults to native host mode on non-Windows hosts.
  * Does not infer WSL from path syntax alone.

#### Feature: Runtime target derivation — **MVP core**

* **Description**: Convert a mode into one or more concrete runtime targets.
* **Inputs**:

  * Effective environment mode
  * Host platform
* **Outputs**:

  * Ordered list of runtime targets:

    * `Windows` → `[windows]`
    * `WSL` → `[wsl]`
    * `Both` → `[windows, wsl]`
* **Behavior**:

  * Produces one target for single-environment modes.
  * Produces two isolated targets for `Both`.
  * Marks unsupported targets with a structured error instead of silently falling back.

---

### Capability: Environment-Aware Path Resolution

Resolves configured skill paths according to the selected target environment.

#### Feature: Windows path expansion — **MVP core**

* **Description**: Expand `~` and relative paths using Windows filesystem semantics.
* **Inputs**:

  * Raw configured skills path
  * Windows user home
* **Outputs**:

  * Resolved Windows path
  * Display path label prefixed with `Windows:`
* **Behavior**:

  * Expands `~` to `%USERPROFILE%` / `os.homedir()` on Windows.
  * Normalizes path separators for Windows.
  * Validates path using native Node `fs`.
  * Does not call WSL for Windows-mode paths.

#### Feature: WSL path expansion — **MVP core**

* **Description**: Expand `~` and relative paths inside WSL using Linux semantics.
* **Inputs**:

  * Raw configured skills path
  * WSL `$HOME`
  * Optional WSL distro selector, future-compatible but not required for MVP
* **Outputs**:

  * Resolved Linux path such as `/home/user/.agents/skills`
  * Display path label prefixed with `WSL:`
* **Behavior**:

  * On Windows hosts, obtains WSL `$HOME` through `wsl.exe -- bash -lc`.
  * Inside WSL/native Linux, uses `$HOME` directly.
  * Expands `~` to WSL home, not Windows home.
  * Does not pass Linux paths to Windows `fs.existsSync`.

#### Feature: Multi-target path resolution — **MVP core**

* **Description**: Resolve each configured skills path independently per runtime target.
* **Inputs**:

  * Raw configured paths
  * Runtime target list
* **Outputs**:

  * List of resolved target paths with environment metadata
* **Behavior**:

  * For `Both`, resolves Windows and WSL paths separately.
  * Preserves configured path ordering within each target.
  * Merges results only after each target has completed resolution.
  * Deduplicates by environment plus normalized resolved path, not by path string alone.

---

### Capability: Environment-Aware Filesystem Operations

Performs skill scanning, file reads, and directory listing in the correct environment.

#### Feature: Windows filesystem adapter — **MVP core**

* **Description**: Inspect Windows skill directories using native Node filesystem APIs.
* **Inputs**:

  * Resolved Windows skills path
  * Skill entry constants such as `SKILL.md`
* **Outputs**:

  * Skill records
  * Directory entries
  * File contents
* **Behavior**:

  * Uses `fs.existsSync`, `fs.readdirSync`, `fs.readFileSync`, and `fs.statSync`.
  * Preserves current file size limits and traversal protections.
  * Labels returned paths as `Windows:<path>`.

#### Feature: WSL filesystem adapter — **MVP core**

* **Description**: Inspect WSL skill directories from inside WSL.
* **Inputs**:

  * Resolved WSL skills path
  * Skill entry constants such as `SKILL.md`
* **Outputs**:

  * Skill records
  * Directory entries
  * File contents
* **Behavior**:

  * Executes controlled bash commands through the command runner.
  * Uses bash-compatible commands only.
  * Reads `SKILL.md`, `skill.json`, and directory entries from WSL filesystem.
  * Enforces file size limits before returning content.
  * Labels returned paths as `WSL:/path`.

#### Feature: Cross-environment skill merge — **MVP core**

* **Description**: Merge skills from Windows and WSL without losing their environment identity.
* **Inputs**:

  * Skill records from one or more filesystem adapters
* **Outputs**:

  * Unified sorted skill list
* **Behavior**:

  * Deduplicates by `(environment, directoryPath)`.
  * Allows same skill name to exist in Windows and WSL.
  * Includes environment metadata in each `SkillInfo`.
  * Preserves search ranking across all discovered skills.

#### Feature: Environment-aware absolute path authorization — **MVP core**

* **Description**: Validate absolute paths against configured skill roots in the same environment.
* **Inputs**:

  * Requested absolute path
  * Resolved configured roots
  * Target environment
* **Outputs**:

  * Authorization pass/fail
* **Behavior**:

  * Windows absolute paths are authorized only against Windows roots.
  * WSL absolute paths are authorized only against WSL roots.
  * `Both` mode tries the path only against the environment implied by the selected skill or path label.
  * Prevents path traversal outside the skill directory.

---

### Capability: Environment-Aware Command Execution

Routes commands to the correct shell for the selected target.

#### Feature: Windows command execution — **MVP core**

* **Description**: Execute commands through PowerShell/cmd-compatible shells for Windows targets.
* **Inputs**:

  * Command string
  * Optional cwd
  * Optional timeout
  * Optional environment variables
  * Optional shell override
* **Outputs**:

  * stdout, stderr, exit code, timeout status
  * shell path
  * environment label: `Windows`
* **Behavior**:

  * Preserves existing shell detection order.
  * Expands cwd using Windows semantics.
  * Never receives WSL-only Linux paths unless explicitly converted or rejected.

#### Feature: WSL command execution — **MVP core**

* **Description**: Execute commands through bash in WSL.
* **Inputs**:

  * Command string
  * Optional cwd
  * Optional timeout
  * Optional environment variables
* **Outputs**:

  * stdout, stderr, exit code, timeout status
  * shell: `bash`
  * environment label: `WSL`
* **Behavior**:

  * On Windows hosts, invokes `wsl.exe -- bash -lc '<command>'`.
  * Inside WSL/native Linux, invokes `bash -lc '<command>'`.
  * Expands cwd using WSL semantics.
  * Never sends Linux commands directly to PowerShell.

#### Feature: Command target routing — **MVP core**

* **Description**: Select the correct execution target for `run_command`.
* **Inputs**:

  * Effective environment mode
  * Optional explicit command environment parameter
  * Optional cwd
* **Outputs**:

  * Selected runtime target
* **Behavior**:

  * `Windows` mode always routes to Windows.
  * `WSL` mode always routes to WSL.
  * `Both` mode requires either explicit target or infers from cwd/path label where safe.
  * If `Both` mode cannot infer safely, returns an actionable error instead of guessing.

---

### Capability: Skill Loading and Tool Output

Updates plugin tools so skill operations expose runtime metadata.

#### Feature: Environment-aware `list_skills` — **MVP core**

* **Description**: List/search skills using selected runtime targets.
* **Inputs**:

  * Query
  * Limit
  * Effective config
* **Outputs**:

  * Skills list with environment, resolved path, and display path
* **Behavior**:

  * Scans selected target(s).
  * Searches name, tags, description, and body excerpt.
  * Includes `environment` and `skillMdPath` labels.
  * Reports skipped targets and errors.

#### Feature: Environment-aware `read_skill_file` — **MVP core**

* **Description**: Read `SKILL.md` or another skill file from the correct environment.
* **Inputs**:

  * Skill name or absolute/display path
  * Optional relative file path
* **Outputs**:

  * File content
  * Resolved path
  * Environment metadata
* **Behavior**:

  * Resolves skill by name across selected targets.
  * If duplicate skill names exist in `Both` mode, returns disambiguation metadata or chooses exact path match.
  * Reads files through the adapter for the skill’s environment.

#### Feature: Environment-aware `list_skill_files` — **MVP core**

* **Description**: List files in a skill directory from the correct filesystem.
* **Inputs**:

  * Skill name or absolute/display path
  * Optional sub-path
* **Outputs**:

  * Directory tree
  * Entries with environment metadata
* **Behavior**:

  * Uses Windows adapter for Windows skills.
  * Uses WSL adapter for WSL skills.
  * Applies traversal checks in the same environment as the skill.

#### Feature: Environment-aware tool status and response metadata — **MVP core**

* **Description**: Report which environment and shell each tool used.
* **Inputs**:

  * Tool result
  * Runtime target metadata
* **Outputs**:

  * User-visible metadata fields
* **Behavior**:

  * Adds `environment`, `shell`, `resolvedPath`, and `displayPath` where relevant.
  * Formats skill locations as `WSL:/home/user/...` or `Windows:C:\Users\...`.
  * Includes partial success details for `Both` mode.

---

### Capability: Backward Compatibility and Migration

Keeps existing plugin users working after the change.

#### Feature: Settings migration — **MVP core**

* **Description**: Add environment mode to persisted settings without invalidating current settings.
* **Inputs**:

  * Existing settings file
  * New config value
* **Outputs**:

  * Persisted `skillsEnvironment`
* **Behavior**:

  * Reads old settings safely.
  * Adds missing environment field using default behavior.
  * Preserves `skillsPaths`, `autoInject`, `maxSkillsInContext`, and `shellPath`.

#### Feature: Default behavior preservation — **MVP core**

* **Description**: Avoid changing behavior for users who do not opt into WSL.
* **Inputs**:

  * Host platform
  * Missing environment config
* **Outputs**:

  * Effective default environment
* **Behavior**:

  * On Windows, defaults to `Windows`.
  * On macOS/Linux, continues native Unix shell behavior.
  * Does not auto-select WSL based only on `~`.

#### Feature: Diagnostics for unsupported WSL — **MVP core**

* **Description**: Return actionable errors when WSL is selected but unavailable.
* **Inputs**:

  * Runtime target: WSL
  * WSL probe result
* **Outputs**:

  * Structured error
* **Behavior**:

  * Checks whether WSL command execution is available.
  * Reports failure without falling back to Windows.
  * Includes target-specific error in `Both` mode while still scanning Windows if available.

---

## 3) Repository Structure + Module Definitions — Structural Decomposition

### Proposed Repository Structure

```txt
src/
├── config.ts
├── constants.ts
├── environment.ts              # New: environment mode and target derivation
├── pathResolver.ts             # New: environment-aware path expansion
├── runtime/
│   ├── types.ts                # New: shared runtime contracts
│   ├── windowsRuntime.ts       # New: Windows fs + shell adapter
│   ├── wslRuntime.ts           # New: WSL fs + shell adapter
│   └── index.ts                # New: runtime factory/exports
├── executor.ts                 # Updated: target-aware command execution
├── scanner.ts                  # Updated: delegates fs operations to runtime adapters
├── settings.ts                 # Updated: persist skillsEnvironment
├── toolsProvider.ts            # Updated: environment-aware tool outputs
├── preprocessor.ts             # Updated: inject skills with environment labels
├── setup.ts                    # Updated: bootstrap only compatible native target
├── types.ts                    # Updated: SkillInfo and config types
├── pluginTypes.ts
└── index.ts
```

The current codebase already centralizes config in `config.ts`, settings in `settings.ts`, command execution in `executor.ts`, skill scanning in `scanner.ts`, prompt injection in `preprocessor.ts`, and tool definitions in `toolsProvider.ts`; the proposed structure preserves those boundaries while adding explicit runtime modules.

---

### Module: `environment.ts`

* **Maps to capability**: Runtime Environment Selection
* **Responsibility**: Define environment mode semantics and derive concrete runtime targets.
* **Exports**:

  * `type SkillsEnvironment = "windows" | "wsl" | "both"`
  * `type RuntimeTargetName = "windows" | "wsl"`
  * `parseSkillsEnvironment(value: unknown): SkillsEnvironment`
  * `deriveRuntimeTargets(mode: SkillsEnvironment, host: Platform): RuntimeTargetName[]`
  * `isTargetSupported(target, host): boolean`

---

### Module: `pathResolver.ts`

* **Maps to capability**: Environment-Aware Path Resolution
* **Responsibility**: Resolve configured paths using the selected target’s home directory and path rules.
* **Exports**:

  * `interface ResolvedSkillRoot`
  * `resolveSkillRoots(rawPaths, targets, runtimeRegistry): Promise<ResolvedSkillRoot[]>`
  * `resolveTargetPath(rawPath, target, runtime): Promise<ResolvedSkillRoot>`
  * `formatDisplayPath(target, resolvedPath): string`

---

### Module: `runtime/types.ts`

* **Maps to capability**: Environment-Aware Filesystem Operations and Command Execution
* **Responsibility**: Define adapter interfaces shared by Windows and WSL runtimes.
* **Exports**:

  * `interface RuntimeAdapter`
  * `interface RuntimeExecOptions`
  * `interface RuntimeExecResult`
  * `interface RuntimeFileStat`
  * `interface RuntimeDirectoryEntry`
  * `interface RuntimeReadResult`

---

### Module: `runtime/windowsRuntime.ts`

* **Maps to capability**: Windows filesystem and command execution
* **Responsibility**: Implement Windows-native path, filesystem, and shell operations.
* **Exports**:

  * `createWindowsRuntime(shellPath?: string): RuntimeAdapter`
  * `expandWindowsPath(rawPath: string): string`
  * `execWindowsCommand(command, options): Promise<RuntimeExecResult>`

---

### Module: `runtime/wslRuntime.ts`

* **Maps to capability**: WSL filesystem and command execution
* **Responsibility**: Implement WSL path, filesystem, and bash command operations through WSL.
* **Exports**:

  * `createWslRuntime(options?: WslRuntimeOptions): RuntimeAdapter`
  * `probeWsl(): Promise<WslProbeResult>`
  * `getWslHome(): Promise<string>`
  * `execWslCommand(command, options): Promise<RuntimeExecResult>`

---

### Module: `runtime/index.ts`

* **Maps to capability**: Runtime target derivation and adapter registry
* **Responsibility**: Construct and expose runtime adapters by target.
* **Exports**:

  * `createRuntimeRegistry(config): RuntimeRegistry`
  * `getRuntime(target): RuntimeAdapter`
  * `listRuntimeTargets(mode): RuntimeTargetName[]`

---

### Module: `executor.ts`

* **Maps to capability**: Environment-Aware Command Execution
* **Responsibility**: Route `run_command` execution to the selected runtime adapter.
* **Current responsibility**: Detect host shell and run one command through that shell.
* **Updated exports**:

  * `execCommand(command, options): Promise<ExecResult>`
  * `execCommandForTarget(target, command, options): Promise<ExecResult>`
  * `resolveShellForTarget(target, shellPath?): ShellInfo`
  * `detectPlatform(): Platform`

---

### Module: `scanner.ts`

* **Maps to capability**: Environment-Aware Filesystem Operations
* **Responsibility**: Discover, search, read, and list skills using runtime adapters.
* **Current responsibility**: Native `fs` skill scanning and search.
* **Updated exports**:

  * `scanSkills(roots: ResolvedSkillRoot[], registry): Promise<SkillInfo[]>`
  * `searchSkills(roots, query, registry): Promise<SkillSearchResult[]>`
  * `resolveSkillByName(roots, skillName, registry): Promise<SkillInfo | SkillResolutionResult>`
  * `readSkillFile(skill, relativeFilePath?, registry): Promise<ReadSkillResult>`
  * `readAbsolutePath(pathRef, roots, registry): Promise<ReadSkillResult>`
  * `listSkillDirectory(skill, relativeSubPath?, registry): Promise<DirectoryEntry[]>`

---

### Module: `settings.ts`

* **Maps to capability**: Backward Compatibility and Migration
* **Responsibility**: Resolve effective config and persist user settings.
* **Updated exports**:

  * `resolveEffectiveConfig(ctl): EffectiveConfig`
  * `parseSkillsPaths(raw: string): string[]`
  * `loadSettings(): PersistedSettings`
  * `saveSettings(settings): void`

---

### Module: `config.ts`

* **Maps to capability**: Runtime Environment Selection
* **Responsibility**: Expose user-configurable plugin fields.
* **Updated exports**:

  * `configSchematics`
* **Required update**:

  * Add `skillsEnvironment` select field:

    * `windows`
    * `wsl`
    * `both`

---

### Module: `toolsProvider.ts`

* **Maps to capability**: Skill Loading and Tool Output
* **Responsibility**: Define plugin tools and return environment-aware metadata.
* **Updated exports**:

  * `toolsProvider(ctl)`
* **Tool behavior updates**:

  * `list_skills`: scans selected runtime targets.
  * `read_skill_file`: reads from the skill’s environment.
  * `list_skill_files`: lists using the skill’s environment.
  * `run_command`: executes in selected/explicit environment.

---

### Module: `preprocessor.ts`

* **Maps to capability**: Skill Loading and Tool Output
* **Responsibility**: Inject available skill list into prompts.
* **Updated exports**:

  * `promptPreprocessor(ctl, userMessage)`
* **Required update**:

  * Inject skill locations with environment labels.

---

### Module: `setup.ts`

* **Maps to capability**: Backward Compatibility and Migration
* **Responsibility**: Bootstrap sample skills only where safe.
* **Updated exports**:

  * `bootstrapSkillsDir(skillsPath, runtimeTarget?)`
* **Required update**:

  * Do not blindly create WSL paths using Windows `fs`.
  * Bootstrap native default only unless runtime target supports creation.

---

### Module: `types.ts`

* **Maps to capability**: Shared domain models
* **Responsibility**: Define plugin data contracts.
* **Updated exports**:

  * `SkillInfo`
  * `PersistedSettings`
  * `EffectiveConfig`
  * `DirectoryEntry`
  * `RuntimeTargetName`
  * `SkillsEnvironment`

---

## 4) Dependency Chain

### Foundation Layer — Phase 0

No dependencies.

* **types**: Shared domain types for skills, settings, directories, and runtime metadata.
* **constants**: Existing constants plus environment config defaults.
* **environment**: Environment enum parsing and target derivation.
* **runtime/types**: Adapter contracts for filesystem and command execution.

### Runtime Adapter Layer — Phase 1

* **runtime/windowsRuntime**
  Depends on: `[types, constants, runtime/types]`

* **runtime/wslRuntime**
  Depends on: `[types, constants, runtime/types]`

* **pathResolver**
  Depends on: `[types, environment, runtime/types]`

### Runtime Registry and Execution Layer — Phase 2

* **runtime/index**
  Depends on: `[environment, runtime/types, runtime/windowsRuntime, runtime/wslRuntime]`

* **executor**
  Depends on: `[constants, environment, runtime/types, runtime/index]`

### Configuration Layer — Phase 3

* **config**
  Depends on: `[constants, environment]`

* **settings**
  Depends on: `[constants, config, environment, types]`

### Skill Operations Layer — Phase 4

* **scanner**
  Depends on: `[constants, types, pathResolver, runtime/types, runtime/index]`

* **setup**
  Depends on: `[constants, pathResolver, runtime/index]`

### Plugin Integration Layer — Phase 5

* **toolsProvider**
  Depends on: `[settings, pathResolver, runtime/index, executor, scanner, types]`

* **preprocessor**
  Depends on: `[settings, pathResolver, runtime/index, scanner, types]`

* **index**
  Depends on: `[config, toolsProvider, preprocessor, setup]`

### Cycle Check

The dependency graph is acyclic:

```txt
types/constants/environment/runtime-types
→ runtime adapters/path resolver
→ runtime registry/executor
→ config/settings
→ scanner/setup
→ tools/preprocessor
→ index
```

No module in a lower layer imports from a higher layer.

---

## 5) Development Phases

### Phase 0: Foundation Contracts

**Goal**: Establish environment and runtime types without changing behavior.

**Entry Criteria**:

* Existing source snapshot compiles.
* Current plugin behavior is understood and covered by baseline tests where available.

**Tasks**:

* [ ] Add environment domain types
  Depends on: `[]`

  * Acceptance criteria:

    * `SkillsEnvironment = "windows" | "wsl" | "both"` exists.
    * `RuntimeTargetName = "windows" | "wsl"` exists.
    * Invalid environment values fall back deterministically.
  * Test strategy:

    * Unit tests for valid values.
    * Unit tests for missing, empty, and invalid values.

* [ ] Add runtime adapter contracts
  Depends on: `[]`

  * Acceptance criteria:

    * Adapter interface covers path expansion, existence checks, stat, directory listing, file reading, and command execution.
    * Results include environment labels.
  * Test strategy:

    * Type-level compile tests.
    * Unit tests using mock adapters.

* [ ] Extend shared settings and skill types
  Depends on: `[]`

  * Acceptance criteria:

    * `PersistedSettings` includes `skillsEnvironment`.
    * `EffectiveConfig` includes `skillsEnvironment`.
    * `SkillInfo` includes `environment`, `displayPath`, and target-specific path fields.
  * Test strategy:

    * TypeScript compile checks.
    * Unit tests for serialization compatibility with old settings.

**Exit Criteria**:

* New types compile.
* No runtime behavior has changed.
* Existing tool provider can still compile against old behavior or temporary shims.

**Delivers**:

* A typed foundation for environment-aware behavior.

---

### Phase 1: Runtime Adapters and Path Resolution

**Goal**: Implement isolated Windows and WSL runtime operations.

**Entry Criteria**:

* Phase 0 complete.

**Tasks**:

* [ ] Implement Windows runtime adapter
  Depends on: `[runtime adapter contracts, environment domain types]`

  * Acceptance criteria:

    * Expands `~` to Windows home.
    * Uses native Node `fs`.
    * Executes through existing Windows shell detection.
    * Returns `environment: "windows"`.
  * Test strategy:

    * Unit tests with mocked `fs`.
    * Shell resolution tests.
    * Path expansion tests for `~`, relative paths, and absolute paths.

* [ ] Implement WSL runtime adapter
  Depends on: `[runtime adapter contracts, environment domain types]`

  * Acceptance criteria:

    * Expands `~` using WSL `$HOME`.
    * Executes via `wsl.exe -- bash -lc` on Windows.
    * Executes via `bash -lc` when already inside WSL/native Linux.
    * Does not use Windows `fs` for Linux paths.
    * Returns `environment: "wsl"`.
  * Test strategy:

    * Unit tests using mocked command execution.
    * Probe failure tests.
    * Quoting tests for bash commands.
    * cwd expansion tests.

* [ ] Implement environment-aware path resolver
  Depends on: `[Windows runtime adapter, WSL runtime adapter]`

  * Acceptance criteria:

    * `Windows` resolves only Windows paths.
    * `WSL` resolves only WSL paths.
    * `Both` resolves separate path lists for both targets.
    * Duplicate detection includes environment.
  * Test strategy:

    * Unit tests for all modes.
    * Tests for `~/.agents/skills`.
    * Tests for semicolon-separated paths.

**Exit Criteria**:

* Runtime adapters can resolve homes, check paths, list directories, read files, and execute commands through mockable interfaces.

**Delivers**:

* Target-isolated path and command primitives.

---

### Phase 2: Target-Aware Command Execution

**Goal**: Make `run_command` execution environment-aware.

**Entry Criteria**:

* Phase 1 complete.

**Tasks**:

* [ ] Refactor `executor.ts` around runtime targets
  Depends on: `[runtime adapters, path resolver]`

  * Acceptance criteria:

    * `execCommandForTarget("windows", ...)` uses Windows shell.
    * `execCommandForTarget("wsl", ...)` uses bash through WSL.
    * Result includes `environment`, `shell`, `platform`, and `cwd`.
  * Test strategy:

    * Unit tests with mocked child process.
    * Timeout tests.
    * stdout/stderr truncation tests.

* [ ] Add command target selection for `Both` mode
  Depends on: `[executor target routing]`

  * Acceptance criteria:

    * `Both` mode accepts explicit environment parameter.
    * If no explicit target and cwd is ambiguous, returns structured error.
    * If cwd has `WSL:` or `Windows:` label, routes correctly.
  * Test strategy:

    * Unit tests for explicit target.
    * Unit tests for ambiguous target.
    * Unit tests for display-path based inference.

**Exit Criteria**:

* Linux commands are never sent to PowerShell in WSL mode.
* Windows commands are never used to inspect WSL-only paths unless wrapped through WSL.

**Delivers**:

* Correct shell routing for the most visible failure mode.

---

### Phase 3: Config and Settings Migration

**Goal**: Expose environment selection and persist it safely.

**Entry Criteria**:

* Phase 0 complete.
* Phase 1 interfaces available.

**Tasks**:

* [ ] Add `skillsEnvironment` config field
  Depends on: `[environment domain types]`

  * Acceptance criteria:

    * UI exposes `Windows`, `WSL`, and `Both`.
    * Default preserves existing behavior.
    * Config value is parsed into typed environment mode.
  * Test strategy:

    * Unit tests for config parsing.
    * Snapshot or schema tests for config field shape.

* [ ] Update settings persistence and migration
  Depends on: `[config field, shared settings types]`

  * Acceptance criteria:

    * Existing settings files without `skillsEnvironment` still load.
    * New value is saved when changed.
    * `default` sentinel resets paths and environment to defaults.
  * Test strategy:

    * Unit tests with old settings JSON.
    * Unit tests with new settings JSON.
    * Reset sentinel tests.

**Exit Criteria**:

* Users can select runtime mode.
* Old configs remain valid.

**Delivers**:

* User-facing environment control.

---

### Phase 4: Environment-Aware Skill Discovery and Reading

**Goal**: Update skill operations to use runtime adapters.

**Entry Criteria**:

* Phase 1 and Phase 3 complete.

**Tasks**:

* [ ] Refactor skill scanning to use runtime adapters
  Depends on: `[path resolver, runtime registry, settings]`

  * Acceptance criteria:

    * Scans Windows paths through Windows adapter.
    * Scans WSL paths through WSL adapter.
    * `Both` mode merges results without environment loss.
    * Skill output includes environment labels.
  * Test strategy:

    * Unit tests with fake runtime adapters.
    * Tests for empty directory.
    * Tests for duplicated skill names across environments.
    * Tests for `SKILL.md` and `skill.json` discovery.

* [ ] Refactor skill file reading
  Depends on: `[environment-aware scanSkills]`

  * Acceptance criteria:

    * `read_skill_file` reads from the selected skill’s environment.
    * Absolute path reads validate against roots in the same environment.
    * Path traversal remains blocked.
  * Test strategy:

    * Unit tests for skill-name lookup.
    * Unit tests for absolute path authorization.
    * Path traversal tests for Windows and WSL separators.

* [ ] Refactor skill directory listing
  Depends on: `[environment-aware scanSkills]`

  * Acceptance criteria:

    * Directory tree comes from the correct environment.
    * Output preserves existing tree format plus environment metadata.
    * Depth and entry count limits still apply.
  * Test strategy:

    * Unit tests for nested directories.
    * Unit tests for max depth.
    * Unit tests for max entries.

**Exit Criteria**:

* `list_skills`, `read_skill_file`, and `list_skill_files` can operate against WSL-only skills.

**Delivers**:

* The first end-to-end MVP path for WSL skill loading.

---

### Phase 5: Tool Provider and Prompt Injection Integration

**Goal**: Surface environment-aware behavior through plugin tools and injected prompts.

**Entry Criteria**:

* Phase 2, Phase 3, and Phase 4 complete.

**Tasks**:

* [ ] Update `list_skills` tool response
  Depends on: `[environment-aware scanSkills]`

  * Acceptance criteria:

    * Response includes `environment`, `skillMdPath`, `displayPath`, and `skillsPaths`.
    * `Both` mode reports per-target scan results.
    * Empty WSL result does not claim Windows paths were scanned when WSL-only mode is selected.
  * Test strategy:

    * Tool-level unit tests with mocked settings and scanner.
    * Response shape tests.

* [ ] Update `read_skill_file` tool response
  Depends on: `[environment-aware readSkillFile]`

  * Acceptance criteria:

    * Response includes resolved environment.
    * Duplicate skill names in `Both` mode are handled deterministically.
    * Absolute paths outside configured roots remain rejected.
  * Test strategy:

    * Tool-level unit tests.
    * Duplicate-name tests.
    * Authorization tests.

* [ ] Update `list_skill_files` tool response
  Depends on: `[environment-aware listSkillDirectory]`

  * Acceptance criteria:

    * Response includes directory environment.
    * Tree output uses correct paths.
    * Sub-path traversal remains blocked.
  * Test strategy:

    * Tool-level unit tests.
    * Sub-path tests.

* [ ] Update `run_command` tool parameters and response
  Depends on: `[target-aware executor, settings]`

  * Acceptance criteria:

    * Adds optional `environment` parameter for `Both` mode.
    * In `WSL` mode, runs bash.
    * In `Windows` mode, runs PowerShell/cmd.
    * Response includes `Execution Environment` and `Shell`.
  * Test strategy:

    * Tool-level tests for each mode.
    * Error test for ambiguous `Both` mode.
    * Response metadata tests.

* [ ] Update prompt injection skill locations
  Depends on: `[environment-aware scanSkills]`

  * Acceptance criteria:

    * Injected `<location>` values include environment label.
    * The model can pass the displayed location back into `read_skill_file`.
  * Test strategy:

    * Unit tests for injection string.
    * Tests for multiple environments.

**Exit Criteria**:

* Tools and prompt injection expose correct environment metadata.

**Delivers**:

* Complete MVP user-visible behavior.

---

### Phase 6: Bootstrap, Diagnostics, and Hardening

**Goal**: Prevent silent fallback and improve supportability.

**Entry Criteria**:

* Phase 5 complete.

**Tasks**:

* [ ] Update bootstrap behavior
  Depends on: `[settings, path resolver, runtime adapters]`

  * Acceptance criteria:

    * Startup does not create WSL-intended paths on Windows using Windows `fs`.
    * Default native bootstrap remains backward-compatible.
    * WSL bootstrap either executes inside WSL or is skipped with clear diagnostic.
  * Test strategy:

    * Unit tests for Windows mode.
    * Unit tests for WSL mode.
    * Startup behavior tests with mocked WSL unavailable.

* [ ] Add diagnostics for unavailable WSL
  Depends on: `[wsl runtime adapter]`

  * Acceptance criteria:

    * WSL mode reports WSL unavailable instead of falling back.
    * Both mode reports partial failure while preserving successful Windows scan.
  * Test strategy:

    * Probe failure tests.
    * Both-mode partial success tests.

* [ ] Add structured logging/status metadata
  Depends on: `[toolsProvider integration]`

  * Acceptance criteria:

    * Tool status messages state target environment.
    * Error messages name the failing environment.
  * Test strategy:

    * Tool status tests where test harness supports status capture.
    * Response error shape tests.

**Exit Criteria**:

* Failure modes are explicit and environment-specific.

**Delivers**:

* Production-safe behavior for mixed Windows/WSL installs.

---

## 6) User Experience

### Personas

#### WSL-first Windows user

* Stores skills in `/home/<user>/.agents/skills`.
* Selects `WSL`.
* Expects all skill discovery and command execution to occur inside WSL.

#### Windows-native user

* Stores skills in `C:\Users\<user>\.agents\skills` or existing LM Studio default paths.
* Selects `Windows` or relies on default.
* Expects no behavior change.

#### Mixed-environment user

* Has some skills in Windows and others in WSL.
* Selects `Both`.
* Needs clear labeling and explicit command target control.

---

### Key Flow: WSL Skills Discovery

1. User opens plugin settings.
2. User sets:

```txt
Skills Paths: ~/.agents/skills
Environment: WSL
```

3. User asks for a task requiring skills.
4. Plugin resolves:

```txt
WSL:~/.agents/skills → WSL:/home/user/.agents/skills
```

5. `list_skills` returns WSL-side skills only.
6. `read_skill_file` reads the WSL file through WSL runtime.
7. `run_command` executes via bash.

Expected response metadata:

```txt
Skills Applied:

skills → WSL:/home/user/.agents/skills/example/SKILL.md
Execution Environment: WSL
Shell: bash
```

---

### Key Flow: Windows Skills Discovery

1. User sets:

```txt
Skills Paths: ~/.agents/skills
Environment: Windows
```

2. Plugin resolves:

```txt
Windows:~/.agents/skills → Windows:C:\Users\<user>\.agents\skills
```

3. Skill scanning uses Windows filesystem APIs.
4. `run_command` uses PowerShell/cmd-compatible shell.

---

### Key Flow: Both Mode

1. User sets:

```txt
Skills Paths: ~/.agents/skills
Environment: Both
```

2. Plugin resolves both:

```txt
Windows:C:\Users\<user>\.agents\skills
WSL:/home/user/.agents/skills
```

3. `list_skills` returns merged results:

```json
[
  {
    "name": "docx",
    "environment": "windows",
    "displayPath": "Windows:C:\\Users\\user\\.agents\\skills\\docx\\SKILL.md"
  },
  {
    "name": "docx",
    "environment": "wsl",
    "displayPath": "WSL:/home/user/.agents/skills/docx/SKILL.md"
  }
]
```

4. If the model calls `run_command` without target and the command is ambiguous, the tool returns an error requiring explicit `environment`.

---

### UI/UX Notes

* Add a select field:

```txt
Skills Runtime Environment
- Windows
- WSL
- Both
```

* Subtitle:

```txt
Controls how skills paths are resolved and which shell is used for commands. Use WSL when paths like ~/.agents/skills should resolve inside Linux.
```

* In `Both` mode, tool output must always show environment labels.
* Avoid silently falling back from WSL to Windows.

---

## 7) Technical Architecture

### System Components

| Component          | Responsibility                                            |
| ------------------ | --------------------------------------------------------- |
| Config schema      | Adds user-facing environment selection                    |
| Settings resolver  | Persists and resolves effective environment mode          |
| Environment module | Converts mode into runtime targets                        |
| Runtime adapters   | Encapsulate filesystem and shell behavior per environment |
| Path resolver      | Expands `~` and normalizes paths per target               |
| Scanner            | Discovers and reads skills through adapters               |
| Executor           | Routes commands to the selected runtime                   |
| Tool provider      | Exposes environment-aware skill and command tools         |
| Preprocessor       | Injects skill list with environment-labeled locations     |

---

### Data Models

#### `SkillsEnvironment`

```ts
export type SkillsEnvironment = "windows" | "wsl" | "both";
```

#### `RuntimeTargetName`

```ts
export type RuntimeTargetName = "windows" | "wsl";
```

#### `ResolvedSkillRoot`

```ts
export interface ResolvedSkillRoot {
  environment: RuntimeTargetName;
  inputPath: string;
  resolvedPath: string;
  displayPath: string;
  exists: boolean;
  error?: string;
}
```

#### Updated `SkillInfo`

```ts
export interface SkillInfo {
  name: string;
  description: string;
  bodyExcerpt: string;
  tags: string[];
  skillMdPath: string;
  directoryPath: string;
  displayPath: string;
  environment: RuntimeTargetName;
  hasExtraFiles: boolean;
}
```

#### Updated `PersistedSettings`

```ts
export interface PersistedSettings {
  skillsPaths: string[];
  skillsEnvironment: SkillsEnvironment;
  autoInject: boolean;
  maxSkillsInContext: number;
  shellPath: string;
}
```

#### Runtime Adapter Interface

```ts
export interface RuntimeAdapter {
  environment: RuntimeTargetName;
  shellName: string;

  getHomeDir(): Promise<string>;
  expandPath(rawPath: string): Promise<string>;

  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<RuntimeFileStat | null>;
  readFile(path: string, maxBytes: number): Promise<RuntimeReadResult>;
  readDir(path: string): Promise<RuntimeDirectoryEntry[]>;

  exec(command: string, options?: RuntimeExecOptions): Promise<RuntimeExecResult>;
}
```

---

### API / Tool Contract Changes

#### `run_command`

Add optional parameter:

```ts
environment?: "windows" | "wsl"
```

Rules:

* Ignored in `Windows` mode unless value is `windows`.
* Ignored in `WSL` mode unless value is `wsl`.
* Required in `Both` mode when cwd/path does not disambiguate.

#### `list_skills`

Add response fields:

```ts
{
  environment: "windows" | "wsl",
  skillMdPath: string,
  displayPath: string
}
```

#### `read_skill_file`

Add response fields:

```ts
{
  environment: "windows" | "wsl",
  resolvedPath: string,
  displayPath: string
}
```

#### `list_skill_files`

Add response fields:

```ts
{
  environment: "windows" | "wsl",
  directoryPath: string,
  displayPath: string
}
```

---

### Design Decisions

#### Decision: Use explicit environment mode, not path inference

* **Rationale**: `~/.agents/skills` is ambiguous on Windows.
* **Trade-off**: Adds one setting.
* **Alternative considered**: Infer WSL from slash-style paths. Rejected because `~` and `/` are not sufficient to distinguish user intent.

#### Decision: Use runtime adapters instead of scattered conditionals

* **Rationale**: Filesystem, path expansion, and command execution must remain consistent per environment.
* **Trade-off**: Requires refactoring scanner and executor.
* **Alternative considered**: Patch `executor.ts` only. Rejected because skill discovery would still use native `fs`.

#### Decision: WSL filesystem operations execute inside WSL

* **Rationale**: Linux paths should be evaluated by Linux tools and Linux home semantics.
* **Trade-off**: Requires careful command quoting and output parsing.
* **Alternative considered**: Access WSL via `\\wsl$`. Rejected for MVP because distro naming and Windows path conversion add complexity and still do not solve shell semantics.

#### Decision: Preserve Windows default behavior

* **Rationale**: Existing users should not experience a behavior change unless they select WSL/Both.
* **Trade-off**: WSL users must opt in.
* **Alternative considered**: Auto-detect WSL whenever path starts with `~`. Rejected due to ambiguity.

---

## 8) Test Strategy

### Test Pyramid

```txt
        /\
       /E2E\        10%
      /------\
     /Integration\  25%
    /------------\
   / Unit Tests  \  65%
  /----------------\
```

### Coverage Requirements

* Line coverage: **85% minimum** for new/changed modules.
* Branch coverage: **80% minimum** for environment routing logic.
* Function coverage: **90% minimum** for runtime/path modules.
* Critical path coverage: **100%** for mode selection, path expansion, and command routing.

---

### Critical Test Scenarios

#### Module: `environment.ts`

**Happy path**:

* Input: `wsl`
* Expected: mode resolves to `wsl`, target list is `[wsl]`.

**Edge cases**:

* Input: empty config.
* Expected: default is host-compatible and backward-compatible.

**Error cases**:

* Input: invalid config string.
* Expected: safe default, no crash.

**Integration points**:

* `settings.ts` consumes parsed mode.
* Expected: persisted settings include valid mode.

---

#### Module: `pathResolver.ts`

**Happy path**:

* Input: `~/.agents/skills`, target `wsl`.
* Expected: `/home/<wsl-user>/.agents/skills`.

**Edge cases**:

* Multiple semicolon-separated paths.
* Expected: each path resolved independently.

**Error cases**:

* WSL target unavailable.
* Expected: WSL-specific error, no Windows fallback.

**Integration points**:

* Scanner receives `ResolvedSkillRoot[]`.
* Expected: scanner never receives unresolved ambiguous `~`.

---

#### Module: `runtime/windowsRuntime.ts`

**Happy path**:

* Input: `~/.agents/skills`.
* Expected: Windows home-expanded path.

**Edge cases**:

* Shell override configured.
* Expected: override is used only for Windows runtime.

**Error cases**:

* Missing directory.
* Expected: exists returns false, scan returns empty.

**Integration points**:

* Executor uses Windows adapter in Windows mode.
* Expected: PowerShell/cmd shell metadata returned.

---

#### Module: `runtime/wslRuntime.ts`

**Happy path**:

* Input: `~/.agents/skills`.
* Expected: WSL home-expanded path.

**Edge cases**:

* WSL command returns CRLF.
* Expected: normalized LF output.

**Error cases**:

* `wsl.exe` unavailable.
* Expected: structured WSL unavailable error.

**Integration points**:

* Scanner reads WSL `SKILL.md`.
* Expected: content returned with `environment: "wsl"`.

---

#### Module: `executor.ts`

**Happy path**:

* Mode: `WSL`
* Command: `ls ~/.agents/skills`
* Expected: command executed through bash, not PowerShell.

**Edge cases**:

* Mode: `Both`, explicit environment `windows`.
* Expected: Windows shell used.

**Error cases**:

* Mode: `Both`, no explicit target and ambiguous cwd.
* Expected: structured error requiring target.

**Integration points**:

* `run_command` tool displays environment and shell.
* Expected: response metadata matches selected runtime.

---

#### Module: `scanner.ts`

**Happy path**:

* WSL root contains `example/SKILL.md`.
* Expected: `scanSkills` returns `example` with WSL path.

**Edge cases**:

* Same skill name exists in Windows and WSL.
* Expected: both skills returned with distinct environment metadata.

**Error cases**:

* `SKILL.md` too large.
* Expected: existing truncation behavior preserved.

**Integration points**:

* `preprocessor.ts` injects environment-labeled locations.
* Expected: injected path can be used by `read_skill_file`.

---

#### Module: `toolsProvider.ts`

**Happy path**:

* WSL selected; `list_skills`.
* Expected: response lists WSL paths only.

**Edge cases**:

* Both selected; WSL unavailable but Windows available.
* Expected: partial success plus WSL diagnostic.

**Error cases**:

* Read absolute WSL path while Windows-only selected.
* Expected: rejected as outside configured environment.

**Integration points**:

* Tool status messages.
* Expected: status includes environment target.

---

### E2E Acceptance Tests

#### E2E: WSL-only skills path

* Setup:

  * Host: Windows with WSL available.
  * Config:

    * `skillsPath = ~/.agents/skills`
    * `skillsEnvironment = wsl`
  * WSL contains `/home/user/.agents/skills/demo/SKILL.md`.
* Expected:

  * `list_skills` finds `demo`.
  * `read_skill_file("demo")` returns content.
  * `run_command("test -f ~/.agents/skills/demo/SKILL.md && echo ok")` returns `ok`.
  * Output reports `Execution Environment: WSL`, `Shell: bash`.

#### E2E: Windows-only skills path

* Setup:

  * Host: Windows.
  * Config:

    * `skillsPath = ~/.agents/skills`
    * `skillsEnvironment = windows`
  * Windows contains `C:\Users\user\.agents\skills\demo\SKILL.md`.
* Expected:

  * `list_skills` finds Windows skill.
  * No WSL commands are invoked.

#### E2E: Both mode

* Setup:

  * Windows and WSL both contain skills.
  * Config:

    * `skillsPath = ~/.agents/skills`
    * `skillsEnvironment = both`
* Expected:

  * `list_skills` returns both sets.
  * Duplicate names remain distinguishable.
  * `run_command` requires explicit environment if ambiguous.

---

## 9) Risks and Mitigations

### Technical Risk: WSL command quoting bugs

* **Impact**: High
* **Likelihood**: Medium
* **Mitigation**:

  * Centralize WSL command construction.
  * Avoid interpolating untrusted paths directly into shell commands.
  * Use robust quoting helpers.
* **Fallback**:

  * Restrict WSL adapter commands to a small controlled command set for scan/read/list operations.

### Technical Risk: Large file reads through WSL are slow

* **Impact**: Medium
* **Likelihood**: Medium
* **Mitigation**:

  * Preserve current max file size limits.
  * Use bounded `head`/`tail` reads for large files.
  * Avoid recursive unbounded shell commands.
* **Fallback**:

  * Add lower WSL-specific scan limits if performance is poor.

### Technical Risk: Duplicate skill names in Both mode

* **Impact**: Medium
* **Likelihood**: High
* **Mitigation**:

  * Include environment metadata in all skill records.
  * Prefer exact display path matches.
  * Return disambiguation when name-only lookup is ambiguous.
* **Fallback**:

  * Require explicit display path in `Both` mode when duplicates exist.

### Dependency Risk: WSL unavailable or not configured

* **Impact**: High for WSL users
* **Likelihood**: Medium
* **Mitigation**:

  * Add WSL probe.
  * Return explicit WSL diagnostic.
  * Never silently fall back to Windows.
* **Fallback**:

  * In `Both` mode, continue Windows scan and report WSL failure separately.

### Compatibility Risk: Existing users affected by new setting

* **Impact**: High
* **Likelihood**: Low if defaults are preserved
* **Mitigation**:

  * Default to existing host-native behavior.
  * Migrate settings additively.
  * Preserve `shellPath` behavior for Windows/native execution.
* **Fallback**:

  * Add emergency config default forcing legacy mode.

### Scope Risk: Trying to fully support multiple WSL distros in MVP

* **Impact**: Medium
* **Likelihood**: Medium
* **Mitigation**:

  * MVP uses default WSL distro.
  * Design `WslRuntimeOptions` for future distro selection.
* **Fallback**:

  * Document that MVP targets default WSL distro only.

---

## 10) Appendix

### References

* User-provided issue summary:

  * Bug title: `Plugin resolves WSL skill paths through Windows PowerShell instead of WSL/bash`
  * Required modes: `Windows`, `WSL`, `Both`
  * Required behavior: environment-specific path expansion, filesystem checks, command execution, and skill loading.
* Uploaded source snapshot:

  * Current config includes `skillsPath` and `shellPath`.
  * Current executor detects host platform and selects PowerShell/cmd on Windows.
  * Current scanner uses native Node `fs`.
  * Current tools call scanner/executor without runtime target metadata.

### Assumptions

1. The plugin runs in a Node.js environment with access to `child_process`.
2. On Windows hosts, WSL execution is available through `wsl.exe` when WSL mode is selected.
3. MVP targets the default WSL distribution.
4. Existing `shellPath` remains a Windows/native override and does not override WSL bash behavior unless a future WSL-specific shell override is added.
5. The plugin should not infer WSL solely from slash-style paths.
6. The current sample skill bootstrap should not create WSL paths through Windows `fs`.

### Glossary

| Term                | Definition                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Skills path         | User-configured directory containing skill subdirectories.                                     |
| Skill               | Directory containing a `SKILL.md` entry point.                                                 |
| Runtime environment | The target environment used for path resolution, filesystem operations, and command execution. |
| Windows target      | Native Windows filesystem and PowerShell/cmd execution.                                        |
| WSL target          | Linux filesystem and bash execution through WSL.                                               |
| Both mode           | Mode that searches Windows and WSL independently and merges results with labels.               |
| Display path        | User-visible path prefixed with `Windows:` or `WSL:`.                                          |

### Open Questions

1. Should the plugin eventually support selecting a specific WSL distribution?
2. Should `shellPath` be split into `windowsShellPath` and `wslShellPath`?
3. Should `Both` mode prefer Windows or WSL when duplicate skill names exist and the user passes only a name?
4. Should default skills bootstrap be supported inside WSL, or should users manually create WSL skills directories?
5. Should the config label be exactly `Environment`, or more explicit as `Skills Runtime Environment`?

---

# Final Decision Updates

## 1. WSL Distribution Support

**Decision**: Yes.

Add optional WSL distribution selection.

### Config field

```txt
WSL Distribution
```

### Behavior

* Empty value uses the default WSL distro.
* Non-empty value uses the named distro.
* All WSL operations must use the configured distro:

  * path expansion
  * filesystem checks
  * skill scanning
  * skill reading
  * skill file listing
  * command execution
  * bootstrap

### Command form

Default distro:

```bash
wsl.exe -- bash -lc '<command>'
```

Named distro:

```bash
wsl.exe -d <distro> -- bash -lc '<command>'
```

### Acceptance criteria

* If `Environment = WSL` and `WSL Distribution = Ubuntu-24.04`, all WSL operations run in `Ubuntu-24.04`.
* If the configured distro is unavailable, return a WSL-specific error.
* Do not fall back to Windows when WSL or the configured distro fails.
* In `Both` mode, the Windows target still runs independently if WSL fails.

---

## 2. Split Shell Settings

**Decision**: Yes.

Replace the single shell override with environment-specific shell settings.

### Config fields

```txt
Windows Shell Path
WSL Shell Path
```

### Behavior

#### Windows Shell Path

* Applies only to:

  * `Environment = Windows`
  * Windows side of `Environment = Both`
* Overrides Windows shell selection.
* Existing `shellPath` migrates to `windowsShellPath`.

#### WSL Shell Path

* Applies only to:

  * `Environment = WSL`
  * WSL side of `Environment = Both`
* Defaults to `bash`.
* Allows alternate WSL shells such as `/bin/zsh`.

### Command form

```bash
wsl.exe -- <wslShellPath> -lc '<command>'
```

or with distro:

```bash
wsl.exe -d <distro> -- <wslShellPath> -lc '<command>'
```

### Acceptance criteria

* Windows shell overrides are never applied to WSL.
* WSL shell overrides are never applied to Windows.
* Existing `shellPath` values migrate to `windowsShellPath`.
* `wslShellPath` defaults to `bash`.

---

## 3. Duplicate Skill Names in Both Mode

**Decision**: No special conflict resolution required.

Duplicate names are acceptable because they represent user-managed copies of the same skill. Users can disable one environment by selecting `Windows` or `WSL` instead of `Both`.

### Behavior

* `Both` mode returns both skills with environment labels.
* Duplicate names do not cause an error.
* If a display path is provided, use that exact environment.
* If only a skill name is provided, select deterministically and report which environment was used.

### Deterministic default

```txt
Windows first, then WSL
```

### Acceptance criteria

* Same-name skills in Windows and WSL are both discoverable.
* Tool output always includes environment metadata.
* Name-only resolution does not fail solely because duplicates exist.

---

## 4. Default Skill Bootstrap in WSL

**Decision**: Preserve the existing bootstrap behavior and translate it to the selected runtime.

The current bootstrap logic should remain conceptually unchanged:

```txt
create directory if missing
copy bundled samples into directory
preserve relative structure
```

The change is only **where that logic executes**.

### Required behavior

| Environment | Bootstrap behavior                                                 |
| ----------- | ------------------------------------------------------------------ |
| `Windows`   | Run the existing bootstrap logic against the Windows filesystem    |
| `WSL`       | Run the same bootstrap logic inside WSL against the WSL filesystem |
| `Both`      | Run the same bootstrap logic once for Windows and once for WSL     |

### WSL behavior

When `Environment = WSL`, the bootstrap target resolves using WSL path rules:

```txt
~/.lmstudio/skills -> /home/<wsl-user>/.lmstudio/skills
~/.agents/skills   -> /home/<wsl-user>/.agents/skills
```

The plugin must perform the same bootstrap operation inside WSL, not against the Windows filesystem.

### Acceptance criteria

* With `Environment = WSL`, bootstrap creates/copies only in WSL.
* With `Environment = Windows`, bootstrap creates/copies only in Windows.
* With `Environment = Both`, bootstrap performs the same operation independently in both places.
* No Windows fallback occurs when WSL is selected.
* Bootstrap output reports the environment used.

---

## 5. Config Label

**Decision**: Use `Environment`.

### Config field

```txt
Environment
```

### Options

```txt
Windows
WSL
Both
```

### Subtitle

```txt
Controls where skill paths are resolved and which shell is used for commands.
```

### Help text

```txt
Choose WSL when paths like ~/.agents/skills should resolve to /home/<user>/... and commands should run through bash. Choose Windows when paths should resolve under the Windows user profile. Choose Both to scan both environments separately.
```

