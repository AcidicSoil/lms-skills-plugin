# Pytest

## Configuration (pyproject.toml)

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = [
    "--strict-markers",
    "--strict-config",
    "-ra",
]
markers = [
    "unit: pure logic tests with in-memory doubles",
    "integrated: filesystem or format-specific tests, no live services",
    "system: tests against real external systems",
]

[tool.coverage.run]
source = ["<package_name>"]  # replace with actual package directory
branch = true

[tool.coverage.report]
fail_under = 100
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

## Test folder structure

```
tests/
  unit/           # markers: @pytest.mark.unit
  integrated/     # markers: @pytest.mark.integrated
  system/         # markers: @pytest.mark.system
  conftest.py     # shared fixtures
```

## Running by layer (make targets)

```makefile
test-unit:
    pytest -m unit

test-integrated:
    pytest -m integrated

test-system:
    pytest -m system

test-all:
    pytest -m unit && pytest -m integrated && pytest -m system

ci:
    pytest -m unit --cov=<package_name> --cov-report=term-missing
```

`test-all` runs fastest-to-slowest. `ci` runs unit only with coverage.

## Markers — always explicit

```python
import pytest

@pytest.mark.unit
def test_given_valid_measurements_when_computing_total_then_returns_sum() -> None:
    ...

@pytest.mark.integrated
def test_given_grimoire_fixture_when_parsing_then_structure_is_valid() -> None:
    ...
```

`--strict-markers` in config means undeclared markers raise an error. Keep the list in `pyproject.toml` as the single registry.

## Fixtures — prefer function scope

```python
import pytest
from myapp.repositories import InMemoryMeasurementRepository

@pytest.fixture
def empty_repository() -> InMemoryMeasurementRepository:
    """Provide a fresh in-memory repository for each test."""
    return InMemoryMeasurementRepository()

@pytest.fixture
def repository_with_data(
    empty_repository: InMemoryMeasurementRepository,
) -> InMemoryMeasurementRepository:
    """Provide a repository pre-loaded with sample measurements."""
    empty_repository.save("stronghold_001", [12, 34, 56])
    return empty_repository
```

Use `scope="session"` only for expensive setup that is truly read-only (loading a large fixture file once).

## `pytest-subtests` — for parametrized behavior in one test

When multiple related assertions belong together and you want individual failure reports:

```python
def test_given_mixed_records_when_validating_then_each_result_is_correct(
    subtests,
) -> None:
    """Validate that each record type is classified correctly."""
    cases = [
        ({"value": 10.0, "stronghold": "Ankh-Morpork"}, True),
        ({"value": None, "stronghold": "Ankh-Morpork"}, False),
        ({"value": -1.0, "stronghold": "Ankh-Morpork"}, False),
    ]
    for record, expected in cases:
        with subtests.test(record=record):
            assert validate_record(record) == expected
```

Prefer `subtests` over `@pytest.mark.parametrize` when the cases share context or setup.
Prefer `@pytest.mark.parametrize` for pure input/output tables.

## `@pytest.mark.parametrize` — for pure input/output tables

```python
@pytest.mark.unit
@pytest.mark.parametrize(
    ("raw_value", "expected"),
    [
        ("12.5", 12.5),
        ("0", 0.0),
        ("-3.1", -3.1),
    ],
)
def test_given_raw_string_when_parsing_value_then_returns_float(
    raw_value: str,
    expected: float,
) -> None:
    """Parse raw measurement strings to floats correctly."""
    assert parse_value(raw_value) == expected
```

## `pytest-cov` — coverage

```bash
pytest --cov=src --cov-report=term-missing --cov-fail-under=100
```

Coverage enforced at 100% on `core/` (domain and application logic) — this is where TDD produces natural full coverage. Outer layers (`shell/`, `adapters/`) are covered by integrated and system tests with no strict threshold; legitimate I/O boundaries use `# pragma: no cover` with a docstring explaining why.

## `pytest.raises` — always as context manager

```python
# ✅
def test_given_empty_list_when_computing_total_then_raises_value_error() -> None:
    """Reject empty measurement lists at computation time."""
    with pytest.raises(ValueError, match="measurements cannot be empty"):
        compute_total([])

# ❌
def test_raises():
    pytest.raises(ValueError, compute_total, [])
```

`match=` is required — assert the error message, not just the type.

## `tmp_path` fixture for filesystem tests

```python
@pytest.mark.integrated
def test_given_valid_data_when_writing_output_then_file_exists(
    tmp_path: Path,
) -> None:
    """Verify output file is created at the expected path."""
    output_path = tmp_path / "output.bin"
    write_spellbook_archive(data, output_path)
    assert output_path.exists()
```

Never use hardcoded paths in tests. Always use `tmp_path`.

## Do not

- Use `assert` outside tests (ruff `B011` will catch this).
- Write tests that pass without asserting anything.
- Share mutable state between tests via module-level variables.
- Use `time.sleep()` in tests — mock time or redesign the code.
- Catch exceptions in tests to make them pass — let them propagate.
- Name tests without describing given/when/then in the function name.
