---
name: ecc-codex-integration
description: "Set up everything-claude-code for Codex using local-first install, optional global sync, and verification. WHEN: \"install ECC for Codex\", \"setup everything-claude-code\", \"sync ECC to Codex\", \"verify Codex skills\"."
---

# ECC Codex Integration

Use this skill when the user wants to install or configure `everything-claude-code` for Codex.

## Workflow

1. **Default local-first** - Avoid mutating `~/.codex` until the user needs global ECC defaults.
2. **Install Codex CLI** - Use the package-manager command in [Local Setup](references/local-setup.md).
3. **Clone ECC** - Install repo dependencies before invoking Codex.
4. **Open Codex inside the repo** - Let repo-local `AGENTS.md` and `.codex/config.toml` load first.
5. **Sync globally only when requested** - Use [Global Sync](references/global-sync.md) with dry-run first.
6. **Verify loading** - Use [Verification](references/verification.md) before calling setup complete.

## Error Handling

Use [Troubleshooting](references/troubleshooting.md) for failed installs, missing skills, sync-script problems, or unexpected global config changes.
