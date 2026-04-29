# Global Sync

Use global sync only when the user wants ECC defaults available in all Codex sessions.

## Commands

```bash
cd everything-claude-code
bash scripts/sync-ecc-to-codex.sh --dry-run
bash scripts/sync-ecc-to-codex.sh
```

## Rules

| Step | Requirement |
|---|---|
| Dry run | Always run first and summarize planned changes. |
| Config mutation | Warn that the script writes into `~/.codex`. |
| Existing config | Preserve user-owned config; do not overwrite manually. |
| Completion | Verify the resulting Codex session loads expected guidance and skills. |

## Notes

The source transcript described the sync script as add-only for managed config, with current-main behavior preserving user config, filling missing non-MCP defaults, and syncing sample role files into `~/.codex/agents`.
