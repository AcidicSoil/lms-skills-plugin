# Command execution safety

This reference describes command and filesystem mutation guardrails for plugin tools.


`run_command` is intentionally **disabled by default**.

This prevents the model from issuing exploratory or destructive shell commands unless the user explicitly enables command execution in plugin settings.

| Mode | Behavior |
|---|---|
| Disabled | Blocks all model-issued shell commands. Recommended default. |
| Read-only | Allows simple inspection commands only. Blocks shell metacharacters, redirects, pipes, command chaining, variable expansion, and mutating arguments. |
| Guarded | Allows broader commands but still blocks dangerous patterns. |

Read-only mode allows inspection-style commands such as:

```text
pwd, ls, cat, head, tail, grep, rg, find, stat, file, wc, sort, diff, env, which
```

The safety policy blocks destructive or high-risk patterns such as:

```text
rm, rmdir, del, Remove-Item
format, mkfs, dd, shred
chmod, chown, chgrp
mv, cp, mkdir, touch, tee
redirection such as >, >>, <<
package managers such as npm install, pip install, apt, brew, choco
network/download tools such as curl, wget, Invoke-WebRequest
ssh, scp, rsync
mutating git commands such as clone, pull, push, reset, clean, checkout
kill/taskkill
nested shells such as bash -c, sh -c, powershell -c
encoded PowerShell
```

This is policy-level hardening, not a full OS sandbox. For untrusted workloads, use an external sandbox such as a container, VM, or locked-down WSL environment with read-only mounts, no network, and resource limits.

### Runtime filesystem tools

The plugin also exposes bounded text-file tools for workflows that need file IO inside the configured skills sandbox:

| Tool | Capability | Guardrail |
|---|---|---|
| `read_file` | Reads a UTF-8 text file by absolute or environment-prefixed path. | Path must resolve inside a configured skills root. Large reads are bounded/truncated by the normal file-size limit. |
| `write_file` | Creates or overwrites a UTF-8 text file. | Path must resolve inside a configured skills root, content is capped at 1 MiB, and writes require Command Execution Safety = Guarded. Existing files require `overwrite=true`. |
| `edit_file` | Replaces exact text in a UTF-8 text file. | Path must resolve inside a configured skills root, writes require Guarded mode, and `expected_replacements` can be used to reject ambiguous edits. |

These tools are intended for authorized skill workflows, not arbitrary project-wide filesystem access. They share the same runtime target resolution, abort handling, structured diagnostics, and timeout wrapping as the other plugin tools.
