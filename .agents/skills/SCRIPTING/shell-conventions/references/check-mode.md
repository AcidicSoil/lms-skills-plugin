# Check Mode

`check` is verification-only. It does not widen into code generation or system redesign.

## Expected Behavior

1. Identify whether the file is a shell script, `Makefile`, or `justfile`.
2. Check the relevant convention set only:
   - shebang and interpreter choice
   - safety flags where appropriate
   - quoting and command validation
   - `Make` / `just` target hygiene
3. Report:
   - clear violations
   - risky patterns
   - concise recommended fixes
4. Stop short of full rewrites or new-task design.

## What Check Mode Must Not Do

- Do not generate a brand-new script.
- Do not redesign a task runner or CI workflow.
- Do not turn a conventions review into a broad automation audit.
- Do not silently fix logic bugs that are unrelated to shell conventions.

## Redirect Instead of Checking

- CI YAML or release workflow design
- New script generation
- Major shell refactor or dialect conversion
- Broad automation architecture review

## Review Questions

- Is the file using the smallest necessary shell feature set?
- Are safety flags appropriate and not cargo-culted?
- Are quoting and command validation handled consistently?
- Are task names and recipes explicit about stateful behavior?
- Is the requested work really conventions-only?

## Output Shape

- `Compliant`: what already follows repo conventions
- `Violations`: concrete convention misses
- `Risks`: patterns that may be correct but deserve review
- `Recommended fixes`: targeted next edits without broadening scope

## Example Findings

- Missing env-based shebang for the chosen shell
- Unquoted variable expansion that can split unexpectedly
- Missing `.PHONY` on a non-file Make target
- Vague stateful target name like `run` or `apply`
- CI YAML submitted to `check` even though it belongs elsewhere
