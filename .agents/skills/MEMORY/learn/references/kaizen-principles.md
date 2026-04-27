# Kaizen Principles for Instruction Maintenance

Four principles for continuous improvement of AI agent instructions.

## 1. Continuous Improvement (Kaizen)

Small, verified changes accumulate into significant improvements.

- Make one change at a time; verify before the next
- Measure improvement against actual practice, not theory
- Improvement is never finished — revisit periodically
- A 1% improvement per session compounds rapidly

## 2. Error-Proofing (Poka-Yoke)

Prefer mechanisms that make mistakes impossible over instructions that ask agents to avoid them.

| Mechanism | Example | Strength |
|-----------|---------|----------|
| Hook (PostToolUse) | Auto-run ruff after Python edits | Strongest — automatic |
| Scoped rule | "Run wagents validate after SKILL.md edits" | Strong — triggered on path |
| Skill convention | "Use uv, not pip" in python-conventions | Medium — requires auto-invoke |
| Prose instruction | "Remember to lint" in global.md | Weakest — easily forgotten |

**Decision**: Always choose the strongest mechanism that fits the use case.

## 3. Standardized Work

Follow existing patterns. Do not invent new conventions when established ones exist.

- Match the naming, formatting, and structure of surrounding files
- Check AGENTS.md for the canonical format before creating assets
- Use `wagents new` templates as starting points
- When a pattern works, document it; when it does not, fix the root cause

## 4. Just-In-Time (JIT)

Build only what is needed. Optimize only what is measured.

- Do not add instructions for hypothetical scenarios
- Do not create rules for problems that have occurred fewer than 3 times
- Do not optimize token budget without measurement
- When in doubt, wait for more evidence before codifying
