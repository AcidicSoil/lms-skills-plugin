# Types Python 3.12+

## Core principle

Type annotations are executable documentation. They describe intent,
catch errors before runtime, and make refactoring safe.
Annotate all public functions. Let inference handle locals.

## 3.12+ syntax — always use over legacy forms

```python
# ✅ 3.12+ generic syntax (PEP 695)
def batch[T](items: list[T], size: int) -> list[list[T]]: ...
type Callback[T] = Callable[[T], None]
type Grid = list[list[float]]

# ❌ legacy TypeVar
from typing import TypeVar
T = TypeVar("T")
```

## Built-in generics — no `typing` imports needed (3.9+)

```python
# ✅
def process(records: list[dict[str, float]]) -> tuple[float, float]: ...
def index(items: list[str]) -> dict[str, int]: ...

# ❌ unnecessary since 3.9
from typing import List, Dict, Tuple
def process(records: List[Dict[str, float]]) -> Tuple[float, float]: ...
```

## `X | Y` union syntax (3.10+)

```python
# ✅
def find(stronghold_id: str) -> Stronghold | None: ...
def parse(value: str | int | float) -> float: ...

# ❌
from typing import Optional, Union
def find(stronghold_id: str) -> Optional[Stronghold]: ...
```

## `TypedDict` for structured dicts

When a dict has a known shape, make it explicit:

```python
from typing import TypedDict

class StrongholdConfig(TypedDict):
    id: str
    name: str
    latitude: float
    longitude: float
    active: bool
```

## `Protocol` for structural typing — prefer over ABC for interfaces

```python
from typing import Protocol

class PotionStockRepository(Protocol):
    """Structural interface for potion stock persistence."""
    def save(self, stronghold_id: str, stock_levels: list[float]) -> None: ...
    def find_by_stronghold(self, stronghold_id: str) -> list[float]: ...
```

Fakes and in-memory implementations satisfy `Protocol` without inheriting from it.
This makes test doubles trivial to write.

## `Literal` for constrained values

```python
from typing import Literal

Status = Literal["pending", "processing", "done", "failed"]

def update_status(task_id: str, status: Status) -> None: ...
```

## `Final` for constants

```python
from typing import Final

MAX_BATCH_SIZE: Final = 1000
DEFAULT_CRS: Final = "EPSG:4326"
```

## `overload` for multiple signatures

```python
from typing import overload

@overload
def parse_value(raw: str) -> float: ...
@overload
def parse_value(raw: bytes) -> float: ...
def parse_value(raw: str | bytes) -> float:
    """Parse a raw enchantment power value from string or bytes."""
    ...
```

## `Self` for fluent builders

```python
from typing import Self

class QuestQueryBuilder:
    def filter_by_stronghold(self, stronghold_id: str) -> Self:
        """Add stronghold filter to the query."""
        ...
        return self
```

## mypy configuration (pyproject.toml)

```toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true
disallow_any_generics = true
```

`strict = true` enables: `disallow_untyped_defs`, `disallow_incomplete_defs`,
`check_untyped_defs`, `disallow_untyped_decorators`, `warn_redundant_casts`,
`warn_unused_ignores`, `warn_return_any`, `no_implicit_reexport`, `strict_equality`.

## pyright configuration (pyrightconfig.json or pyproject.toml)

```toml
[tool.pyright]
pythonVersion = "3.12"
typeCheckingMode = "strict"
reportMissingImports = true
reportMissingTypeStubs = false
```

## Running in CI

```makefile
typecheck:
    mypy src/
    pyright src/
```

Run both — mypy and pyright catch different classes of errors.

## `# type: ignore` rules

- Never use without an inline docstring explaining why.
- Prefer `# type: ignore[specific-error-code]` over bare `# type: ignore`.
- If you need it more than once for the same reason, fix the root cause.

## Do not

- Use `Any` unless wrapping an untyped third-party boundary — document it.
- Use `cast()` to silence errors — fix the types instead.
- Import from `typing` what is available as a built-in (3.9+: `list`, `dict`, `tuple`, `set`).
- Annotate every local variable — let inference work, annotate only at boundaries.
- Use `Optional[X]` — use `X | None`.
