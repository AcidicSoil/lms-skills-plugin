# Task Completion Checklist

Before considering a code task complete:
1. Review the changed files for consistency with existing TypeScript style and defensive error handling patterns.
2. Run `npm run build` or `bun run build` to verify the TypeScript project compiles.
3. Optionally run `npx tsc --noEmit` for a no-output type check if build artifacts should be avoided.
4. Run `git status --short` to see all modified/untracked files.
5. Run `git diff` to review changes before handing off.
6. If behavior changed, mention the affected plugin tools or prompt preprocessor flow in the summary.
7. If tests/lint/format scripts are added later, run the relevant package scripts and update `suggested_commands.md` accordingly.

Current limitations:
- No test suite is configured in `package.json`.
- No lint or formatting scripts are configured in `package.json`.
- README suggests `bun install` / `bun run dev`, but no lockfile was visible during onboarding.