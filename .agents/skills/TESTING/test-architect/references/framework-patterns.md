# Framework-Specific Testing Patterns

## Contents

1. [pytest (Python)](#pytest)
2. [jest (JavaScript/TypeScript)](#jest)
3. [vitest (JavaScript/TypeScript)](#vitest)
4. [Common Patterns](#common-patterns)

---

## pytest

### Directory Structure

```
tests/
  conftest.py          # Shared fixtures
  test_models.py       # Unit tests by module
  test_api.py
  integration/
    conftest.py        # Integration-specific fixtures
    test_database.py
  e2e/
    test_workflows.py
```

### Fixture Patterns

```python
# Scoped fixtures for expensive setup
@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine("sqlite:///:memory:")
    yield engine
    engine.dispose()

@pytest.fixture
def db_session(db_engine):
    session = Session(db_engine)
    yield session
    session.rollback()
    session.close()
```

### Parametrize for Edge Cases

```python
@pytest.mark.parametrize("input_val,expected", [
    ("", ValueError),
    (None, TypeError),
    ("valid", "VALID"),
    ("  spaces  ", "SPACES"),
])
def test_transform(input_val, expected):
    if isinstance(expected, type) and issubclass(expected, Exception):
        with pytest.raises(expected):
            transform(input_val)
    else:
        assert transform(input_val) == expected
```

### Markers for Test Categories

```python
# pytest.ini or pyproject.toml
[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow (>1s)",
    "integration: requires external services",
    "e2e: end-to-end workflow tests",
]
```

---

## jest

### Directory Structure

```
src/
  utils.ts
  utils.test.ts        # Co-located unit tests
  __tests__/
    integration/
      api.test.ts
    e2e/
      workflow.test.ts
```

### Mock Patterns

```typescript
// Module mock
jest.mock('./database', () => ({
  query: jest.fn().mockResolvedValue([]),
}));

// Spy on existing method
jest.spyOn(service, 'save').mockResolvedValue({ id: 1 });

// Reset between tests
afterEach(() => jest.restoreAllMocks());
```

### Async Testing

```typescript
test('fetches data', async () => {
  const result = await fetchData('id-1');
  expect(result).toEqual({ id: 'id-1', name: 'test' });
});

test('handles timeout', async () => {
  await expect(fetchData('slow')).rejects.toThrow('timeout');
});
```

---

## vitest

### Key Differences from jest

| Feature | jest | vitest |
|---------|------|--------|
| Mock function | `jest.fn()` | `vi.fn()` |
| Mock module | `jest.mock()` | `vi.mock()` |
| Fake timers | `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| Config | `jest.config.ts` | `vitest.config.ts` or `vite.config.ts` |
| Coverage | `--coverage` | `--coverage` (uses v8 or istanbul) |

### In-source Testing

```typescript
// utils.ts
export function add(a: number, b: number) { return a + b; }

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  test('add', () => { expect(add(1, 2)).toBe(3); });
}
```

---

## Common Patterns

### Arrange-Act-Assert (AAA)

Every test follows three phases:
1. **Arrange**: Set up test data and dependencies
2. **Act**: Execute the function under test
3. **Assert**: Verify the result

### Test Naming Convention

```
test_<function>_<scenario>_<expected_result>
test_parse_empty_string_raises_value_error
test_calculate_negative_input_returns_zero
```

### Assertion Best Practices

| Bad | Good | Why |
|-----|------|-----|
| `assertTrue(result)` | `assertEqual(result, expected)` | Specific assertion gives better error messages |
| `assertNotNone(result)` | `assertEqual(result.status, "ok")` | Test the actual property, not just existence |
| `assert len(items) > 0` | `assertEqual(len(items), 3)` | Exact count catches regressions |
