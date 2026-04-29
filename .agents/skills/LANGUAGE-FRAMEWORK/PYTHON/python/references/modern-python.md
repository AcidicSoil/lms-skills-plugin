# Modern Python 3.12+

## Key features to use actively

### Type parameter syntax (PEP 695)
Cleaner generic definitions — prefer over legacy `TypeVar`:

```python
# ✅ 3.12+
def first[T](items: list[T]) -> T:
    return items[0]

type Vector = list[float]
type Matrix[T] = list[list[T]]

# ❌ legacy
from typing import TypeVar
T = TypeVar("T")
```

### f-string improvements (PEP 701)
Nested expressions and multi-line f-strings are now valid:

```python
# ✅ 3.12+
label = f"stronghold: {stronghold.name!r} ({stronghold.id:{'>'}10})"
```

### `pathlib` over `os.path` — always
```python
# ✅
from pathlib import Path
output = Path("data") / "processed" / f"{date}.nc"
output.parent.mkdir(parents=True, exist_ok=True)

# ❌
import os
output = os.path.join("data", "processed", f"{date}.nc")
```

### Structural pattern matching (PEP 634) — use where it clarifies
```python
match event:
    case {"type": "alert", "level": level}:
        handle_alert(level)
    case {"type": "info", "message": msg}:
        log_info(msg)
    case _:
        raise ValueError(f"Unknown event: {event}")
```

### `tomllib` for config (stdlib since 3.11)
```python
import tomllib
with open("pyproject.toml", "rb") as f:
    config = tomllib.load(f)
```

## Standard practices

### Dataclasses over dicts for structured data
```python
from dataclasses import dataclass, field

@dataclass(frozen=True)
class Stronghold:
    """Represents a guild stronghold in the realm."""
    id: str
    name: str
    coordinates: tuple[float, float]
    tags: frozenset[str] = field(default_factory=frozenset)
```

Use `frozen=True` for value objects. Use `slots=True` for performance-critical dataclasses.

### `__slots__` on hot-path classes
```python
@dataclass(slots=True)
class SpellCasting:
    """Single spell casting record at a point in time.
    # The Librarian catalogues every casting. Ook.
    """
    stronghold_id: str
    value: float
    timestamp: int
```

### Exception handling — be specific
```python
# ✅
try:
    result = parse_grimoire_file(path)
except FileNotFoundError:
    raise MissingGrimoireError(path) from None
except struct.error as error:
    raise CorruptGrimoireError(path) from error

# ❌
try:
    result = parse_grimoire_file(path)
except Exception:
    pass
```

### Context managers for resource cleanup
```python
from contextlib import contextmanager

@contextmanager
def open_dataset(path: Path):
    """Open a spellbook archive dataset and ensure it is closed on exit."""
    dataset = netCDF4.Dataset(path)
    try:
        yield dataset
    finally:
        dataset.close()
```

### `itertools` and `functools` over manual loops
```python
import itertools, functools

pairs = list(itertools.pairwise(timestamps))
total = functools.reduce(lambda acc, x: acc + x, measurements, 0)
batches = itertools.batched(records, 1000)  # 3.12+
```

### `itertools.batched` (new in 3.12)
```python
for batch in itertools.batched(large_record_list, 500):
    process_batch(batch)
```

## Do not

- Use `os.path` for filesystem operations — use `pathlib`.
- Use bare `except:` or `except Exception:` without re-raising or wrapping.
- Use mutable default arguments (`def f(items=[])`).
- Use `global` or `nonlocal` — extract to a class or pass state explicitly.
- Use `print()` for observability — use `logging` or structured logging.
- Write `# type: ignore` without a docstring explaining why.
