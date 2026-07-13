## What the screenshot covers

The sidebar currently exposes:

* Execution environment selection
* Optional WSL distribution override
* Host shell path override
* Windows shell selection
* Existing skill-path and prompt-injection settings

That addresses only the **environment-selection surface**. The workspace model and most of the execution guarantees discussed are not visible or not yet demonstrated.

## Areas still incomplete or insufficiently specified

### 1. Workspace configuration is missing

The primary requested feature is not present in the screenshot.

The sidebar still needs:

* A **Workspace** selector
* A workspace path field or directory picker
* A visible active workspace/profile name
* Validation status such as `Valid`, `Unavailable`, or `Configuration required`
* Separate retained Host and WSL paths behind one contextual field
* A way to clear, relocate, rename, restore, or delete a workspace

Recommended UI order:

```text
Execution Environment
Workspace
Advanced execution settings
Skills configuration
```

### 2. The UI is not sufficiently contextual

With `WSL` selected, the screenshot still shows:

* `Shell Path`
* `Windows Shell`

Those are Host-specific controls and should normally be hidden or disabled in WSL mode.

Likewise:

* Host mode should not show WSL distribution configuration.
* WSL mode should not expose PowerShell versus `cmd.exe`.
* Descriptions should state which environment a setting affects.

This prevents users from assuming that the Windows shell controls WSL commands.

### 3. WSL distribution behavior diverges from the agreed default

The screenshot exposes `WSL Distribution` as a normal text field.

The agreed initial behavior was:

* Use the system default distribution.
* Avoid requiring distribution configuration.
* Add an override only for advanced multi-distribution cases.

A better presentation would be:

```text
WSL Distribution
Default distribution

[ ] Override default distribution
    Distribution name: ______
```

A free-text field also leaves several unresolved cases:

* Misspelled distribution names
* Deleted distributions
* Distribution names containing spaces
* Validation timing
* Whether the value is chat-scoped or global

A discovered dropdown would be preferable when the SDK permits dynamic options.

### 4. Per-chat scope is not communicated

The active environment and workspace are supposed to be chat-scoped. The UI should make this clear, particularly if other settings on the same sidebar are plugin-global.

Without that distinction, users cannot tell whether changing `Execution Environment` affects:

* The current chat
* All chats
* The persistent workspace profile
* The entire plugin installation

The storage model also needs to separate:

* Chat-scoped active selection
* Persistent workspace profiles
* Global plugin defaults

### 5. Workspace profiles are not represented

A raw path alone is insufficient for the continuity requirement.

A workspace profile needs a durable identity independent of its path, with at least:

* Stable ID
* Editable display name
* Host path
* WSL path
* Last-used session reference, where supported
* Workspace-specific settings
* Availability and deletion state

The sidebar likely needs a workspace selector plus actions such as:

```text
Workspace: my-project
Path: /home/user/projects/my-project

Rename
Locate
Manage paths
Delete
```

### 6. Session restoration remains technically unresolved

The desired behavior was defined, but SDK feasibility was not established.

Still unresolved:

* Whether LM Studio exposes session IDs to plugins
* Whether a plugin can enumerate sessions
* Whether it can reopen a prior session
* Whether session references remain stable after restart
* Whether session association is available per chat

This feature must degrade cleanly:

* Workspace persistence should work without session APIs.
* The UI must not promise “Resume last session” until the host supports it.
* The plugin must never duplicate transcript content as a workaround.

### 7. WSL capability state is not shown

The environment selector should distinguish:

* WSL ready
* `wsl.exe` unavailable
* No distribution installed
* No default distribution
* Distribution unavailable
* Capability check pending

The screenshot only shows `WSL (Windows only)` as selectable. It does not show whether WSL has actually been detected or validated.

The sidebar also needs a **Refresh WSL status** action when capability changes after plugin startup.

### 8. Workspace validation behavior is not exposed

The UI needs explicit handling for:

* Unset workspace
* Relative path
* Wrong path syntax for the selected environment
* Missing directory
* Inaccessible directory
* Moved or renamed directory
* Repository identity mismatch
* Soft-deleted matching profile

An invalid configured path must not silently revert to a home directory.

A useful status pattern would be:

```text
Workspace
/home/user/project

Status: Directory not found
[Locate workspace] [Clear]
```

### 9. End-to-end WSL routing has not been demonstrated

The environment field alone does not establish first-class WSL support.

Every workspace-facing operation must follow the selected environment:

* Command execution
* File reads
* File writes
* Patching
* Directory listing
* Directory creation
* File moves
* File deletion
* Repository detection
* Dependency/tool discovery
* Path canonicalization

The major failure mode is:

> `run_command` executes through WSL while file tools continue using Windows Node filesystem APIs.

That would produce inconsistent views of the same workspace.

### 10. Command and shell semantics need clearer separation

The current fields mix three concepts:

* Execution environment
* Host shell selection
* Optional custom shell path

The implementation still needs an explicit internal distinction between:

* Structured program-and-argument execution
* Shell-command-string execution

For WSL:

* Structured operations should use direct execution.
* Raw `run_command` strings should use a shell inside WSL.
* Host shell settings must not affect the WSL shell.
* The plugin should not attempt to tokenize arbitrary command strings.

A WSL shell override should be omitted initially or placed under advanced settings.

### 11. Tool workspace requirements are not visible

Tools need explicit metadata such as:

* Workspace-independent
* Workspace-optional
* Workspace-required
* Destructive
* Host-only
* WSL-compatible

When a required workspace is unset, the tool should produce a structured result directing the user to configure it. This should not depend on detecting relative paths inside command text.

### 12. Boundary and override controls are absent

The agreed model treats the workspace as the default execution boundary.

The UI or invocation flow still needs to support:

* Environment override
* Outside-workspace path approval
* Persistent workspace-specific path grants
* Read-only versus read/write grants
* Destructive-operation approval
* Exact affected-path previews

These controls should not be ordinary always-on sidebar toggles. They belong primarily at invocation time, with persistent grants managed under workspace settings.

### 13. Active process behavior is not represented

The design specified that workspace switching and deletion should be blocked while an invocation is active or unresolved.

Still needed:

* Invocation ownership by workspace
* Cancellation state
* Confirmed process termination
* Process-tree handling
* Workspace lock state
* Recovery when termination cannot be confirmed

Without this, a WSL process could continue modifying one project after the UI switches to another.

### 14. Workspace lifecycle management is missing

The sidebar needs an eventual management surface for:

* Rename workspace
* Add Host path
* Add WSL path
* Locate moved workspace
* Accept changed repository identity
* Soft delete
* Restore
* Permanently delete
* Revalidate suspended grants

The agreed 30-day recovery period also requires a way to view deleted workspaces.

### 15. Repository identity behavior remains underdefined

We established the user-facing policy, but not the exact identity algorithm.

Still unresolved at implementation level:

* Which Git metadata is stored
* Whether remote URLs are normalized
* How non-Git directories are identified
* How forks and changed remotes are treated
* How copied repositories are distinguished
* What constitutes strong versus weak identity evidence

This should be advisory and fail closed on mismatch, without making Git a workspace requirement.

### 16. Audit-history management is not represented

The design includes local workspace-specific audit metadata for exceptional permissions.

A management surface is still needed for:

* Viewing recent approvals and overrides
* Clearing history
* Configuring retention
* Showing storage scope
* Confirming that output, file contents, and complete command strings are excluded

The default retention decision was 90 days or 1,000 records per workspace, whichever occurs first.

### 17. Migration and compatibility were not fully covered

Adding these settings requires explicit migration behavior for existing users.

The implementation must define:

* Default environment for existing chats
* How existing `shellPath` and `windowsShell` values are preserved
* Whether existing JSON settings receive a schema version
* What happens when persisted workspace data is malformed
* How downgrade to an older plugin version behaves
* Whether WSL-specific settings are ignored safely on non-Windows systems

### 18. Error contract is not specified

Errors should be structured enough for the UI and model to distinguish:

* `WORKSPACE_REQUIRED`
* `WORKSPACE_UNAVAILABLE`
* `WORKSPACE_OUTSIDE_BOUNDARY`
* `WSL_UNAVAILABLE`
* `WSL_DISTRIBUTION_NOT_FOUND`
* `ENVIRONMENT_INCOMPATIBLE`
* `IDENTITY_VERIFICATION_REQUIRED`
* `APPROVAL_REQUIRED`
* `PROCESS_TERMINATION_UNRESOLVED`

Plain stderr text will make recovery behavior inconsistent.

### 19. Tests and observable acceptance behavior remain incomplete

At minimum, coverage should prove:

* Host and WSL settings remain isolated.
* Different chats may use different workspaces.
* WSL paths are never passed to host filesystem APIs.
* Invalid workspaces never fall back to home.
* All file tools use the selected backend.
* Environment switching does not affect active invocations.
* Distribution overrides are validated.
* Existing users retain prior shell configuration.
* Non-Windows systems cannot activate WSL.
* Workspace restoration does not reactivate grants silently.

## Highest-priority gaps

For the original goal, these are the immediate blockers:

1. Add the contextual **Workspace** control.
2. Make sidebar fields environment-aware.
3. Decide whether the distribution override is advanced-only or remove it initially.
4. Route all filesystem and command operations through Host/WSL backends.
5. Enforce strict workspace validation with no home-directory fallback.
6. Establish chat-scoped selection versus persistent profile storage.
7. Add WSL capability detection and execution-time preflight.
8. Add integration tests proving end-to-end WSL behavior.

The permissions, audit, session-restoration, and soft-delete systems are valuable, but they are secondary phases. They should not delay a correct first release of workspace selection and end-to-end WSL execution.
