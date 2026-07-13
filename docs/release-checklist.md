# Release Checklist: Host and WSL Workspaces

Use this checklist on a Windows machine with LM Studio, the plugin, and at least one initialized WSL distribution.

## Environment Record

- Tester:
- Date:
- Windows version/build:
- LM Studio version:
- Plugin version:
- Plugin commit:
- WSL version:
- Distribution and version:
- Result: Pass / Fail / Blocked
- Evidence location:

## Automated Gate

1. Check out the release commit.
2. Run `npm install` if dependencies are not present.
3. Run `npm run verify:release`.
4. Confirm all tests pass, TypeScript builds, required `dist` artifacts exist, and tracked files remain unchanged.

Expected: command exits successfully and prints `Release verification passed.`

## Windows Host Workflow

Set **Execution Environment** to **Host**.

| Step | Action | Expected result | Pass/Fail | Evidence/notes |
|---|---|---|---|---|
| H1 | Open a project/chat and call `get_current_directory` | Reports `environment: host`, a workspace ID, provider identity, and a Host-native workspace root |  |  |
| H2 | Call `create_directory` for `release-check/docs` | Directory is created inside the reported root |  |  |
| H3 | Write `release-check/docs/a.txt` with spaces, quotes, Unicode, and multiple lines | Exact content is written |  |  |
| H4 | Patch the file and read it back | Only the requested occurrence changes and content round-trips |  |  |
| H5 | List recursively from `release-check` | The file and directory appear with workspace-relative paths |  |  |
| H6 | Run `run_command` with a command that prints its working directory | Printed cwd equals the reported workspace root |  |  |
| H7 | Run a command with `cwd: release-check/docs` | Printed cwd is the contained subdirectory |  |  |
| H8 | Attempt `cwd: ../outside` and a file path outside the workspace | Both are rejected; no home fallback occurs |  |  |
| H9 | Move `a.txt` to `b.txt`, rename to `c.txt`, then delete it | Lifecycle succeeds without silent overwrite |  |  |
| H10 | Repeat `get_current_directory` in the same project/chat | Workspace ID/root remain stable |  |  |
| H11 | Open a different provider working directory | Workspace ID/root differ |  |  |
| H12 | Run a command that exceeds the timeout | `timedOut` is true; termination uncertainty is reported when applicable |  |  |

## Real WSL Workflow

Set **Execution Environment** to **WSL** and choose an initialized distribution.

| Step | Action | Expected result | Pass/Fail | Evidence/notes |
|---|---|---|---|---|
| W1 | Call `get_current_directory` | Reports `environment: wsl`, selected distribution, and a Linux-native root under `~/.lmstudio/lms-skills/workspaces/` |  |  |
| W2 | Confirm the root is not under `/mnt/c` | Workspace is stored in the Linux filesystem |  |  |
| W3 | Create `release-check/docs` | Directory is created inside the WSL workspace |  |  |
| W4 | Write/read a file containing spaces, quotes, `$HOME`, semicolons, Unicode, and multiple lines | Content round-trips exactly; shell expansion does not alter it |  |  |
| W5 | Patch, append, and recursively list the file | Operations succeed with Linux-native paths |  |  |
| W6 | Run `pwd` | Output equals the reported WSL workspace root |  |  |
| W7 | Run with `cwd: release-check/docs` | Output equals the contained Linux subdirectory |  |  |
| W8 | Attempt a Windows path such as `C:\temp` | Operation is rejected; no `/mnt/c` translation occurs |  |  |
| W9 | Attempt `../outside` | Canonical/lexical escape is rejected |  |  |
| W10 | Move to an existing destination | Operation fails instead of reporting a false success |  |  |
| W11 | Configure a misspelled or removed distribution | Error names the unavailable distribution and available choices; no Host fallback occurs |  |  |
| W12 | Restore the valid distribution and repeat inspection | Original deterministic workspace is available |  |  |
| W13 | Trigger a timeout | `timedOut` is true and termination uncertainty appears when applicable |  |  |
| W14 | Complete move/rename/delete cleanup | Lifecycle succeeds and workspace root cannot be deleted |  |  |

## Skill-Boundary Check

1. Configure a known skill directory.
2. Run `list_skills`, `list_skill_files`, and `read_skill_file`.
3. Confirm skill files come from the configured skill root, not the project workspace.

Expected: skill access remains separate in both Host and WSL modes.

## Release Decision

- Automated gate: Pass / Fail
- Windows Host workflow: Pass / Fail / Blocked
- WSL workflow: Pass / Fail / Blocked
- Skill-boundary check: Pass / Fail / Blocked
- Final decision: Release-ready / Not release-ready
- Open issues:
- Approver:
