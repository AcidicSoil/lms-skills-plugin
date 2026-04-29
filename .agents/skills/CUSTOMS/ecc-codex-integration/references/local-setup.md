# Local Setup

Use this path for the safest default install. It keeps ECC scoped to the cloned repo until the user explicitly wants global Codex defaults.

## Commands

```bash
npm i -g @openai/codex@latest
git clone https://github.com/affaan-m/everything-claude-code.git
cd everything-claude-code
npm install
codex
```

## Expected behavior

| Surface | Expected result |
|---|---|
| `AGENTS.md` | Codex loads repo instructions automatically when launched from the repo. |
| `.codex/config.toml` | Project-local defaults apply without editing `~/.codex/config.toml`. |
| `.agents/skills/` | ECC Codex skills are available from the repo skill tree. |

## Guardrail

Do not run the sync script during local setup. The user can evaluate the repo-local behavior first, then decide whether to copy ECC defaults into `~/.codex`.
