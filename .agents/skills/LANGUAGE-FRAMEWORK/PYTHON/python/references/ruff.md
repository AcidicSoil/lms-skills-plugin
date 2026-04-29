# Ruff

## What Ruff is

Ruff is linter and formatter for Python, replacing flake8, isort, pyupgrade, and black.
It is the single tool for code style enforcement. Run it before every commit and in CI.

## Configuration (pyproject.toml)

```toml
[tool.ruff]
target-version = "py312"
line-length = 88

[tool.ruff.lint]
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # pyflakes
    "I",    # isort
    "B",    # flake8-bugbear
    "C4",   # flake8-comprehensions
    "UP",   # pyupgrade
    "N",    # pep8-naming
    "SIM",  # flake8-simplify
    "TCH",  # flake8-type-checking
    "ANN",  # flake8-annotations
    "PT",   # flake8-pytest-style
    "RUF",  # ruff-specific rules
]
ignore = [
    "ANN101",  # missing type annotation for self
    "ANN102",  # missing type annotation for cls
]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["ANN"]  # annotations optional in tests

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
docstring-code-format = true
```

## Key rule sets explained

**`B` (bugbear):** catches real bugs — mutable default args, assert in non-test code,
loop variables captured in closures, useless expressions.

**`C4` (comprehensions):** enforces idiomatic list/dict/set comprehensions over
`list(map(...))`, `list(filter(...))`, unnecessary comprehensions.

**`UP` (pyupgrade):** enforces 3.12+ syntax — removes `Optional`, `Union`, old-style
type aliases, legacy `TypeVar`.

**`SIM` (simplify):** collapses redundant conditions, simplifies `if/else` returns,
merges nested `with` statements.

**`TCH` (type-checking):** moves type-only imports inside `TYPE_CHECKING` blocks
to avoid runtime overhead. Use string literals for the annotations (`"HeavyClass"`).

**`PT` (pytest-style):** enforces pytest idioms — `pytest.raises` as context manager,
correct use of fixtures, consistent assertion style.

## Make targets

```makefile
lint:
    ruff check src/ tests/

lint-fix:
    ruff check --fix src/ tests/

format:
    ruff format src/ tests/

format-check:
    ruff format --check src/ tests/
```

`ci` target must include `format-check` and `lint` — not `lint-fix`.
Auto-fix only in developer workflow, never in CI.

## Commonly triggered patterns to know

### `B006` — mutable default argument
```python
# ❌ ruff B006
def process(items: list[str] = []) -> None: ...

# ✅
def process(items: list[str] | None = None) -> None:
    items = items or []
```

### `C414` — unnecessary list/tuple in comprehension
```python
# ❌ ruff C414
result = list(list(x for x in items))

# ✅
result = list(x for x in items)
```

### `SIM108` — ternary over if/else return
```python
# ❌ ruff SIM108
if condition:
    return a
return b

# ✅
return a if condition else b
```

### `UP006` / `UP007` — legacy type annotations
```python
# ❌ ruff UP006, UP007
from typing import List, Optional
def f(items: List[str]) -> Optional[int]: ...

# ✅
def f(items: list[str]) -> int | None: ...
```

### `TCH001` — runtime import that should be type-only
```python
# ❌ ruff TCH001
from mymodule import HeavyClass
def f(obj: HeavyClass) -> None: ...

# ✅
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from mymodule import HeavyClass
def f(obj: "HeavyClass") -> None: ...
```

## Do not

- Add `# noqa` without specifying the rule code (`# noqa: B006`).
- Add `# noqa` without a docstring explaining the exception.
- Run `ruff check --fix` in CI — fix locally, check in CI.
- Disable entire rule sets to avoid fixing violations.
