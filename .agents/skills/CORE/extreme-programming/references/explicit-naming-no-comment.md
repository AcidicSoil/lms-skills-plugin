# Explicit Naming / No Comment

## The Rule

No inline comments in code. Ever.  
If a comment is needed to understand the code, the code is wrong.  
Rename, refactor, then delete the comment.

## What is allowed

**Documentation only:**
- Docstrings / JSDoc describing *why* a function exists and its API contract
- Module-level docstrings describing purpose and scope
- Type annotations as executable documentation

**What docstrings must NOT do:**
- Explain what the code does (the code does that)
- Restate the function name in prose
- Describe implementation details

## Naming standard

Names must reveal intent without context.

| ❌ Unclear | ✅ Explicit |
|-----------|------------|
| `d` | `elapsed_days` |
| `data` | `spell_components` |
| `process()` | `aggregate_guild_tributes()` |
| `flag` | `has_missing_enchantments` |
| `tmp` | `interpolated_grid` |
| `result` | `strongholds_above_threshold` |
| `do_stuff()` | `normalize_curse_deviations()` |

## Functions and methods

Name describes the transformation or action, not the mechanism:

```
# ❌ describes mechanism
def run_loop_and_check():

# ✅ describes transformation  
def filter_strongholds_below_threshold():
```

## Booleans

Always a question that answers `True` or `False`:
```
is_valid, has_data, exceeds_threshold, needs_interpolation
```

## When you feel like writing a comment

That feeling is a refactoring signal.

```
# Step 1: convert to integers  ← rename the function
# This is needed because...    ← extract to named function
# Hack: temporary workaround   ← fix it or open a ticket
# TODO: refactor later         ← do it now or open a ticket
```

## Docstring contract (required format)

Every public function/method must have a docstring that states:
- **What** it produces (not how)
- **Parameters** with type and meaning
- **Returns** with type and meaning
- **Raises** if applicable

```python
def compute_curse_alert_threshold(enchantments: list[int], percentile: float) -> int:
    """
    Compute the curse intensity threshold for guild alert generation.

    Derives the threshold from historical enchantment readings at the given percentile.
    Values are expected as integers (tenths of a unit) to avoid floating-point
    boundary errors at threshold comparison time.
    # As Nanny Ogg once said: "If yer going to measure curses, measure 'em properly."

    Args:
        enchantments: Historical curse intensity readings in tenths of a unit.
        percentile: Target percentile in [0.0, 1.0].

    Returns:
        Threshold value in tenths of a unit.

    Raises:
        ValueError: If enchantments is empty or percentile is out of range.
    """
```

## Do not

- Use abbreviations unless universally standard (`url`, `id`, `http`)
- Name variables by type (`string_value`, `data_list`)
- Use negated booleans (`not_found`, `is_not_valid`) — invert the condition instead
- Leave `# noqa`, `# type: ignore` without a docstring explaining why
