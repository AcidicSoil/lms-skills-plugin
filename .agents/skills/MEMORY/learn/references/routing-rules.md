# Routing Decision Tree

Use this tree to determine where an instruction change should be routed.

## Step 1: Scope Assessment

- Does this apply to ALL projects the user works on?
  - Yes -> proceed to Step 2
  - No -> route to the project's `AGENTS.md`

## Step 2: Domain Classification

- Is it about a specific programming language or tool?
  - Python tooling -> `python-conventions` skill
  - JavaScript/Node.js tooling -> `javascript-conventions` skill
  - Agent definitions -> `agent-conventions` skill
  - No specific language -> proceed to Step 3

## Step 3: Orchestration Check

- Is it about parallel execution, teams, or task dispatch?
  - Yes -> `orchestrator` skill body
  - No -> proceed to Step 4

## Step 4: Enforcement Type

- Is this a deterministic "run X after editing Y" trigger?
  - Yes -> `.claude/rules/<topic>.md` (scoped rule)
  - No -> `instructions/global.md`

## Step 5: Verify Placement

Before finalizing the target:

1. Read the current content of the target file
2. Check for existing rules that cover or contradict the proposed change
3. Identify the correct section within the target file
4. Prefer adding to an existing section over creating a new one

## Common Routing Mistakes

| Mistake | Correct Route |
|---------|---------------|
| Adding language rules to global.md | Route to the language convention skill |
| Adding project rules to global.md | Route to the project's AGENTS.md |
| Adding orchestration rules to a language skill | Route to orchestrator skill |
| Adding a one-time fix as a permanent rule | Do not route — it is not a pattern |
| Adding prose instructions for deterministic checks | Use a scoped rule or hook instead |

## Token Budget Awareness

- `instructions/global.md` is always loaded — keep it minimal
- Skill bodies load on demand — prefer routing to skills over global.md
- Scoped rules cost zero tokens when inactive — prefer for path-conditional enforcement
- If the change adds more than 50 tokens to global.md, consider a skill instead
