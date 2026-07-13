# Architecture Research

## Recommended Components

### Execution Settings

Extend existing configuration/types with execution mode, WSL distribution, and workspace-root policy. Normalize persisted legacy settings into Host mode.

### Capability Detector

A Windows-only service invokes `wsl.exe` to determine availability and installed distributions. Results should be cached briefly and invalidated when settings change.

### Execution Adapter

Introduce one interface for command execution:

- `HostExecutionAdapter` wraps current shell behavior.
- `WslExecutionAdapter` invokes `wsl.exe --distribution <name> -- ...` and normalizes output, timeout, and errors.

### Workspace Manager

Derive a deterministic project ID from available chat/controller identity, create the root idempotently, and return an immutable context containing execution mode, host-visible path, environment-native path, and distribution.

### Path Policy and Translator

Classify paths before translation. Keep translation pure where possible. Resolve relative paths against the active native workspace root, canonicalize, then enforce containment.

### Tool Router

Refactor filesystem and command tools to accept the same resolved workspace context. Skill-library reads remain governed by existing skill-root policy and should not be conflated with project workspace access.

## Data Flow

Host configuration + controller identity → effective execution settings → capability validation → workspace resolution → execution context.

Tool call → input validation → context resolution → path classification/containment → host or WSL adapter → structured result.

## Build Order

1. Characterization tests and shared types.
2. Settings, capability detection, and path translation.
3. Workspace manager and execution adapters.
4. Tool migration and integration tests.
5. Documentation, migration checks, and release verification.

## Boundaries

- Configuration does not execute commands.
- Path translation does not perform filesystem mutation.
- Workspace manager does not contain tool-specific behavior.
- Adapters do not decide project identity.
- Tools do not construct WSL command strings directly.
