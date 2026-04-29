---
name: skills-index-updater
description: Regenerate skill indexes for Cline. ONLY use when the user EXPLICITLY asks to "update skill index", "sync skills", "regenerate index", or "update cline_overview.md". Do NOT auto-invoke after creating/modifying skills.
---

# Skill index updater

Automatically regenerate skill indexes by scanning skill directories and updating:
- **Global skills** -> `~/Documents/Cline/Rules/cline_overview.md`
- **Local skills** -> `.clinerules/agents_skills.md` in the repo (only when NOT in home directory)

---

> **Note:** This skill is for Cline, which does not have native skill indexing built-in.

---

## Quick start

```bash
# Run from any location
python3 ~/.claude/skills/skills-index-updater/scripts/update_skill_index.py

# Preview changes without writing
python3 ~/.claude/skills/skills-index-updater/scripts/update_skill_index.py --dry-run
```

## Prerequisites

- Python 3.8+
- PyYAML package (`pip install pyyaml`) - optional, falls back to regex parsing
- For Cline: `~/Documents/Cline/Rules/cline_overview.md` must exist with `## Available Global Skills Index` section

---

## How it works

The script automatically determines what to update based on your current location:

| Location | Global skills | Local skills |
|----------|---------------|--------------|
| Home directory (`~/`) | Updated in `cline_overview.md` | Skipped (none exist) |
| Any repo | Updated in `cline_overview.md` | Updated in `.clinerules/agents_skills.md` |
| Directory with .clinerules/agents_skills.md | Updated in `cline_overview.md` | Updated in `.clinerules/agents_skills.md` |
| Outside a repo (no agents_skills.md) | Updated in `cline_overview.md` | Skipped (use --force-local to override) |

### Skill locations

The script checks multiple locations and uses the first one with skills:

**Global skills (checked in order):**
1. `~/Documents/Cline/skills/`
2. `~/.kiro/skills/`

**Local skills (checked in order):**
1. `./.claude/skills/`
2. `./.kiro/skills/`

| Scope | Output files |
|-------|-------------|
| Global | `~/Documents/Cline/Rules/cline_overview.md` |
| Local | `.clinerules/agents_skills.md` in repo root |

### Available flags

| Flag | Short | Behavior |
|------|-------|----------|
| `--dry-run` | `-n` | Show changes without writing |
| `--init` | | Create `.clinerules/agents_skills.md` if missing (auto-prompted otherwise) |
| `--force-local` | | Force local skills update even without git repo |

---

## Workflow

### 1. Run the update script

```bash
python3 ~/.claude/skills/skills-index-updater/scripts/update_skill_index.py
```

The script will:
1. Detect your working directory and whether you're in a git repo
2. Scan global skills in `~/Documents/Cline/skills/`
3. Update `~/Documents/Cline/Rules/cline_overview.md` with global skills index
4. If in a repo (and not in home directory):
   - Scan local skills in `.claude/skills/`
   - Update `.clinerules/agents_skills.md` with local skills index

### 2. Verify output

```bash
# Check cline_overview.md update
grep -A 20 "## Available Global Skills Index" ~/Documents/Cline/Rules/cline_overview.md

# Check agents_skills.md update (if in a repo)
grep -A 10 "## Available Local Skills Index" .clinerules/agents_skills.md
```

---

## Example output

```
Working directory: /Users/you/projects/my-repo
Home directory: /Users/you
In home directory: False
Repository root: /Users/you/projects/my-repo

============================================================
GLOBAL SKILLS
============================================================
Scanning global skills in: /Users/you/Documents/Cline/skills
  Found 5 global skills

  Skills found:
    - skill-builder (skill-builder)
    - skills-index-updater (skills-index-updater)
    - save-context (save-context)
    - humanize (humanize)
    - docx (docx)

Updated: /Users/you/Documents/Cline/Rules/cline_overview.md

============================================================
LOCAL SKILLS
============================================================
Scanning local skills in: /Users/you/projects/my-repo/.claude/skills
  Found 2 local skills

  Skills found:
    - extract-videos (extract-videos)
    - download-transcripts (download-transcripts)

Updated: /Users/you/projects/my-repo/.clinerules/agents_skills.md

============================================================
SUMMARY
============================================================
Index update complete.
```

---

## Output formats

### Global skills (in cline_overview.md)

```
## Available Global Skills Index
*(Auto-generated - do not edit manually)*

  path: Documents/Cline/skills/skill-builder
  name: skill-builder
  description: Create, evaluate, and improve Agent skills...
---
  path: Documents/Cline/skills/humanize
  name: humanize
  description: Convert AI-written text to more human-like writing...
---
```

### Local skills (in .clinerules/agents_skills.md)

```markdown
## Available Local Skills Index
_This index is for IDEs that don't natively support skills. Skip if your IDE reads SKILL.md directly._

- **Name:** `extract-videos`
  - **Trigger:** Extract video URLs from various sources...
  - **Path:** `.claude/skills/extract-videos/SKILL.md`

- **Name:** `download-transcripts`
  - **Trigger:** Download and process video transcripts...
  - **Path:** `.claude/skills/download-transcripts/SKILL.md`
```

---

## Quality rules

- **Descriptions come from frontmatter** - Never manually edit the index
- **Global and local are separate** - Each goes to its own file
- **Run after every skill change** - Create, delete, or modify triggers update

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "cline_overview.md not found" | Missing Cline config | Create `~/Documents/Cline/Rules/cline_overview.md` with index section |
| Skill not appearing | Missing frontmatter | Add `name:` and `description:` to SKILL.md |
| YAML parse error | Invalid frontmatter syntax | Check for tabs, missing colons |
| Index section not found | Missing marker | Add `## Available Global Skills Index` section |
| Local skills skipped | Working from ~/ | This is expected (no local skills in home directory) |

---

## Additional resources

- **[TESTING.md](TESTING.md)** - Evaluation scenarios and validation commands
