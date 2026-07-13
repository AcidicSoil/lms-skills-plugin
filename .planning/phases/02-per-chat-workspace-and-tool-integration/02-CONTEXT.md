# Phase 2 Context: Per-Chat Workspace and Tool Integration

## Approved User Story

As an LM Studio user, I want to be able to easily utilize WSL while using the skills plugin, and I want every project-scoped file and shell tool to use one deterministic per-chat workspace in my selected environment, so that file edits and commands operate on the same predictable project.

## Locked Decisions

- Use the LM Studio tools provider controller's `getWorkingDirectory()` value as the stable per-chat/project identity seam available in the installed SDK.
- Do not use per-tool-call IDs as workspace identity; those are scoped to one act/tool invocation.
- Derive a deterministic workspace ID from normalized controller working-directory identity.
- Host mode uses a host-native workspace root.
- WSL mode uses a Linux-native workspace root in the selected/default distribution.
- File tools and `run_command` must resolve relative paths through the same immutable workspace context.
- Workspace creation is idempotent.
- Skill discovery and skill-file reads remain governed by configured skill roots, not workspace policy.
- Wrong-environment absolute paths and workspace escape fail closed.
- A removed or unavailable WSL distribution returns a structured error and does not corrupt stored identity.

## Scope Fences

- No dedicated workspace browser/history UI.
- No custom workspace-root templates.
- No Host↔WSL file mirroring.
- No remote/container execution.
- No automatic WSL installation or distribution switching.
- No broad redesign of skill scanning or prompt preprocessing.

## Existing Contracts

- `src/pathPolicy.ts` provides environment classification and containment primitives.
- `src/executor.ts` accepts explicit environment, distribution, and cwd.
- `src/settings.ts` resolves Host/WSL settings.
- `src/toolsProvider.ts` currently performs direct host filesystem access and must be migrated.
- The installed LM Studio SDK exposes `ToolsProviderController.getWorkingDirectory()`.

## Phase Outcome

All project-scoped file and shell tools share one deterministic, inspectable workspace context in Host or WSL mode, with automated integration coverage and unchanged skill-root boundaries.
