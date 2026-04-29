# Verification

Run verification after local setup and again after optional global sync.

## Smoke test

```bash
cd everything-claude-code
codex
```

Ask Codex:

```text
Summarize the loaded AGENTS guidance and list the relevant available skills for this repo.
```

## Pass criteria

| Check | Pass condition |
|---|---|
| Repo instructions | Response references loaded `AGENTS.md` guidance. |
| Project config | Response reflects `.codex/config.toml` behavior or profile defaults. |
| Skill surface | Response lists or acknowledges ECC skills under `.agents/skills/`. |
| Scope | Local-only setup works before global sync is attempted. |

## Optional filesystem checks

```bash
test -f AGENTS.md
test -f .codex/config.toml
find .agents/skills -name SKILL.md | head
```
