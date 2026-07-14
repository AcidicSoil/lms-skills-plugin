<!-- generated-by: gsd-doc-writer -->
# Contributing

Thank you for contributing to the LMS Skills Plugin.

## Development Setup

```bash
git clone https://github.com/AcidicSoil/lms-skills-plugin.git
cd lms-skills-plugin
npm install
npm run build
npm test
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for architecture and coding guidance.

## Before Opening a Pull Request

Run the complete release gate:

```bash
npm run verify:release
```

The command must pass from a clean tracked tree. It runs all tests, builds `dist/`, checks expected artifacts, validates whitespace, and rejects tracked build drift.

## Change Requirements

- Add or update tests for behavior changes.
- Preserve Host as the backward-compatible default.
- Cover both Host and WSL when changing paths, commands, skill access, workspace behavior, or tools.
- Do not add silent fallback or implicit path translation between Host and WSL.
- Keep project workspace paths canonically contained.
- Keep skill roots separate from project workspaces.
- Update user documentation for new settings, tools, diagnostics, or shell behavior.
- Do not edit generated `dist/` files directly or commit `.test-dist/`.

## Pull Requests

1. Branch from `main`.
2. Keep commits focused and use descriptive messages.
3. Explain the user-visible behavior and affected environments.
4. Include automated test evidence.
5. Include real Host/WSL evidence when the change depends on actual platform behavior.
6. Open the pull request against `main`.

No repository-specific pull request template is currently present.

## Reporting Bugs

Include:

- operating system and version;
- LM Studio version;
- plugin version or commit;
- selected execution environment;
- selected WSL distribution or Host shell;
- `get_current_directory` output when relevant;
- exact error text and reproduction steps.

Do not include secrets or private file contents.

## Security-Sensitive Areas

Treat these changes with extra care:

- path classification and canonical containment;
- Host/WSL process invocation;
- shell argument construction;
- timeout and process-tree termination;
- workspace deletion and moves;
- skill-root resolution and traversal protection.

## License

Contributions are accepted under the repository's [Apache License 2.0](LICENSE).
