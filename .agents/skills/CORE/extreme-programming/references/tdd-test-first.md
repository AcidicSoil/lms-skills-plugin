# TDD / Test First

## The Rule

Every public function or method has tests written **before** the implementation.  
No exceptions. No "I'll add tests after". No "this is too simple to test".

## Red / Green / Refactor

```
RED    → Write a failing test that describes the expected behavior
GREEN  → Write the minimum code to make it pass. No more.
REFACTOR → Clean the implementation without breaking the test
```

Repeat for every behavior. One cycle = one behavior.

## What "minimum code" means

GREEN means the test passes — not that the code is elegant.  
Elegance is REFACTOR's job. Never mix them.

## Natural 100% Coverage

Coverage is a by-product, not a goal.  
If every behavior is test-first, coverage reaches 100% naturally.  
If coverage is below 100% on public API, a behavior was not specified first — fix that.

Private functions are implementation details. Test them through the public API only.

## What to test

- Return values for given inputs
- Side effects (writes, calls, state changes) that are part of the contract
- Error cases and boundary conditions
- **Not**: internal wiring, private helpers, framework internals

## Test doubles hierarchy

Prefer the simplest double that makes the test possible. Never reach for a mock library first.

### 1. In-memory implementation (fake/stub) — default choice
Write a real but simplified implementation of the dependency.  
An in-memory repository that satisfies the same interface as the database one.  
Tests are fast, deterministic, and verify real behavior without I/O.

```python
class InMemoryPotionStockRepository:
    """In-memory fake for unit testing potion stock persistence."""
    def __init__(self):
        self._store: dict[str, list[int]] = {}

    def save(self, stronghold_id: str, stock_levels: list[int]) -> None:
        self._store[stronghold_id] = stock_levels

    def find_by_stronghold(self, stronghold_id: str) -> list[int]:
        return self._store.get(stronghold_id, [])
```

### 2. Golden master / file fixture (integrated test) — when in-memory is impossible
For I/O involving specific binary or domain formats (GRIB2, NetCDF, HDF5…),  
use real sample files as fixtures and compare output against a known-good reference.  
These are **integrated tests** (not unit), run against the filesystem.  
Slightly slower is acceptable — they test real format behavior without a live system.

Folder convention: `tests/integrated/`

```
tests/
  unit/           # pure logic, in-memory doubles, fastest
  integrated/     # filesystem, real formats, no live services
  system/         # real external systems (dedicated env or not)
```

### 3. End-to-end / system test — only at true system boundaries
Against real systems: live database, real API, real object storage.  
Use sparingly. Mark explicitly. Run last.

Folder convention: `tests/system/`

### Test double preference order

```
fake/stub (in-memory) > fixture/golden master > real system
spy/mock: almost never
```

**Spy and mock test interactions** (how something was called), not outcomes.  
This couples tests to implementation. When the implementation changes, tests break — not because behavior changed but because wiring changed.  
Prefer dummy (placeholder), stub (canned return), fake (working simplified impl).

## Test suite commands (make targets, language-agnostic concept)

Every project must expose these targets:

| Target | Scope | Speed |
|--------|-------|-------|
| `test: unit` | Pure logic, in-memory doubles | Fastest |
| `test: integrated` | Filesystem, real formats, no live services | Medium |
| `test: system` | Real external systems | Slowest |
| `test: all` | unit → integrated → system in order | Full |

`test: all` always runs fastest-to-slowest. A failure in `unit` stops the chain.

## Test anatomy (language-agnostic)

```
GIVEN  a specific state or input
WHEN   the function is called
THEN   the expected outcome occurs
```

Name tests using this structure:
```
given_valid_potion_stock_when_computing_threshold_then_returns_integer
```

## Failing fast

A test that cannot fail is not a test.  
After writing RED, confirm it actually fails before writing GREEN.

## One assertion per test

Each test verifies one behavior.  
Multiple assertions = multiple behaviors = split the test.  
Exception: asserting the shape of a complex return value is one behavior.

## Do not

- Write implementation first, tests second
- Write tests that always pass
- Skip tests for "simple" getters, constants, or utilities
- Use spy/mock to test interactions — test outcomes through fakes and real assertions instead
