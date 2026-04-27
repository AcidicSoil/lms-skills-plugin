# Flaky Test Diagnosis

## Common Causes

| Cause | Indicators | Frequency |
|-------|-----------|-----------|
| **Timing / race conditions** | `sleep()` calls, "timed out", async waits, thread contention | ~35% |
| **Shared state** | Global variables, singletons, module-level state, class attributes | ~25% |
| **External dependencies** | Connection refused, port in use, API rate limits, DNS failures | ~20% |
| **Non-deterministic ordering** | Passes alone but fails in suite, dict/set iteration, random seeds | ~15% |
| **Date/time sensitivity** | Fails on DST boundaries, midnight, specific days, timezone mismatch | ~5% |

## Diagnosis Protocol

### Step 1: Identify the Pattern

| Observation | Classification |
|------------|----------------|
| Fails randomly everywhere | Timing, shared state |
| Passes locally, fails in CI | Environment, resource contention |
| Fails only when run with other tests | Ordering, shared state |
| Fails more under load / parallel execution | Timing, race condition |
| Fails on specific calendar dates | Date/time sensitivity |

### Step 2: Isolate

- **Run alone**: `pytest test_file.py::test_name -x` -- does it pass consistently?
- **Run repeatedly**: `pytest test_file.py::test_name --count=50` -- any failures?
- **Run in randomized order**: `pytest -p randomly` -- does position matter?
- **Check for shared state**: search for global variables, class-level attributes, module state
- **Check for time dependencies**: search for `sleep`, `time.time`, `datetime.now`

### Step 3: Confirm Root Cause

Run the test with the suspected cause neutralized:
- Timing: replace `sleep()` with a polling loop
- Shared state: add explicit setup/teardown resetting the state
- External dependency: mock the dependency
- Ordering: run the failing test immediately after the suspected polluter
- Date/time: freeze time to the failing timestamp

## Fix Patterns

### Timing / Race Conditions

| Problem | Fix |
|---------|-----|
| `sleep(N)` waiting for async result | Poll with timeout: retry until condition or deadline |
| Thread race on shared resource | Use synchronization primitives (Event, Lock, Barrier) |
| Timeout too tight for CI | Increase timeout; add explicit deadline assertion |

### Shared State

| Problem | Fix |
|---------|-----|
| Global variable mutated by test | Reset in teardown or use per-test fresh instances |
| Singleton carrying state across tests | Add `reset()` method; prefer dependency injection |
| Module-level cache pollution | Clear caches in fixture; use function-scoped fixtures |
| Environment variable side effects | Use `monkeypatch` / `mock.patch.dict(os.environ)` |

### External Dependencies

| Problem | Fix |
|---------|-----|
| Port conflict between parallel tests | Use dynamic port allocation (bind to port 0) |
| Database locked or stale | Use transactions with rollback or fresh DB per test |
| File system collisions | Use `tmp_path` fixture or `tempfile.mkdtemp()` |

### Ordering and Date/Time

| Problem | Fix |
|---------|-----|
| Test depends on prior test's side effect | Make each test self-contained with own setup |
| Dict/set iteration order assumed | Sort before comparison or use order-independent assertions |
| `datetime.now()` in production code | Inject clock; use `freezegun` or `time_machine` in tests |
| Hardcoded future date now in the past | Use relative dates (`today + timedelta(days=30)`) |
| Timezone assumption | Explicitly set timezone in test fixtures |
