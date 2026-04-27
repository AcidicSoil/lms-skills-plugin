# Make and Just Rules

Use this when the active file is `Makefile` or `justfile`.

## Makefile

- Keep targets task-oriented, not implementation-detail oriented.
- Add `.PHONY` for non-file targets.
- Escape `$` as `$$` inside recipes.
- Prefer idempotent recipes where possible.
- Use a `help` target when the file is substantial or intended for repeated team use.
- Do not hide destructive behavior behind vague names like `run`, `do`, or `apply`.
- Keep target side effects obvious from the target name.
- Prefer one clear responsibility per target over large kitchen-sink recipes.

## justfile

- Use parameters only when they materially reduce repetition or ambiguity.
- Keep recipe names explicit and task-oriented.
- Prefer straightforward shell over clever interpolation.
- Document dangerous or stateful tasks clearly in recipe names and comments where needed.
- Keep argument handling simple enough that callers can predict what will happen.
- Avoid using parameters to hide branching logic that belongs in a script.

## Shared Guidance

- Favor clear target names over clever abbreviations.
- Keep task behavior predictable: setup should set up, clean should clean, release should release.
- If the work is really a task-runner redesign or automation architecture change, redirect rather than treating it as a conventions-only edit.

## Review Checklist

- Is `.PHONY` present where the target is not file-producing?
- Are recipe names specific about mutation or destruction?
- Is `$` escaped correctly inside `Makefile` recipes?
- Is the task idempotent or clearly documented when it is not?
- Would a teammate understand what the target does from its name alone?

## Common Smells

- Vague targets that actually mutate state
- Giant orchestration targets that should be split or redirected
- Parameterized just recipes used as a poor substitute for a real script
- Hidden deploy or release behavior in generic target names
