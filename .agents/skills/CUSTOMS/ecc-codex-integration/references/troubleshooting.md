# Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `codex: command not found` | Codex CLI missing or npm global bin not on `PATH`. | Re-run `npm i -g @openai/codex@latest`, then restart the shell. |
| `npm install` fails | Node/npm environment issue or network failure. | Verify `node --version` and `npm --version`, then retry from the ECC repo root. |
| Skills not visible | Codex launched outside the ECC repo or skill path unavailable. | Run `codex` from `everything-claude-code`; check `.agents/skills/*/SKILL.md`. |
| Sync script fails | Wrong working directory or shell invocation. | Run `bash scripts/sync-ecc-to-codex.sh --dry-run` from the ECC repo root. |
| Global config changed unexpectedly | Sync wrote into `~/.codex`. | Inspect `~/.codex/config.toml`; restore from backup if needed and use local-first setup. |
