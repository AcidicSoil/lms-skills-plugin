# Functional Python 3.12+

## Core principle

Prefer pure functions and immutable data. A function that takes inputs and returns outputs
without touching external state is trivially testable, composable, and safe to parallelize.

## Pure transformations over stateful procedures

```python
# ✅ pure — testable without setup, safe to compose
def normalize_enchantments(values: list[float], baseline: float) -> list[float]:
    """Normalize enchantment readings relative to a baseline value."""
    return [v - baseline for v in values]

# ❌ mutates external state — harder to test, harder to reason about
def normalize_in_place(values: list[float], baseline: float) -> None:
    for i in range(len(values)):
        values[i] -= baseline
```

## Immutable data structures

Use `tuple`, `frozenset`, and `frozen=True` dataclasses for values that should not change:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class BoundingBox:
    """Geographic bounding box — immutable value object."""
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float
```

## Pipeline composition with functions

Build pipelines as sequences of pure transformations:

```python
from collections.abc import Callable, Iterable
from functools import reduce

def compose[T](*functions: Callable[[T], T]) -> Callable[[T], T]:
    """Compose functions left-to-right: compose(f, g)(x) == g(f(x))."""
    return reduce(lambda f, g: lambda x: g(f(x)), functions)

clean_pipeline = compose(
    remove_invalid_castings,
    clip_to_valid_range,
    normalize_to_baseline,
)
```

## `map`, `filter`, `itertools` over explicit loops

```python
import itertools

# ✅
active_guilds = filter(lambda g: g.has_data, guilds)
guild_ids = map(lambda g: g.id, active_guilds)
pairs = itertools.pairwise(sorted_timestamps)

# ❌ equivalent but more noise
guild_ids = []
for g in guilds:
    if g.has_data:
        guild_ids.append(g.id)
```

## `functools.partial` for specialization

```python
from functools import partial

clip_potion_potency = partial(clip_to_range, min_value=0.0, max_value=500.0)
clip_curse_intensity = partial(clip_to_range, min_value=-90.0, max_value=60.0)
```

## Generator expressions for lazy pipelines

Avoid materializing large sequences unless necessary:

```python
# ✅ lazy — processes one record at a time
total = sum(record.value for record in records if record.is_valid)

# ❌ materializes entire list in memory
total = sum([record.value for record in records if record.is_valid])
```

## `operator` module over lambda for common operations

```python
import operator

# ✅
sorted_records = sorted(records, key=operator.attrgetter("timestamp"))
totals = map(operator.add, series_a, series_b)

# ❌ lambda adds noise for trivial operations
sorted_records = sorted(records, key=lambda r: r.timestamp)
```

## Separate what from how

The caller decides what data flows through. The function decides how to transform it.
Never hardcode data sources inside transformation functions.

```python
# ✅ transformation is independent of source
def compute_guild_totals(castings: Iterable[SpellCasting]) -> list[GuildTotal]:
    """Aggregate spell castings into guild totals."""
    ...

# ❌ transformation is coupled to source
def compute_guild_totals_from_db() -> list[GuildTotal]:
    castings = db.query(...)
    ...
```

## Do not

- Use mutable default arguments.
- Mutate arguments passed in — return new values.
- Use `global` — pass state explicitly.
- Write functions with hidden side effects that also return values — separate them.
- Nest more than two levels of comprehension — extract to named functions.
