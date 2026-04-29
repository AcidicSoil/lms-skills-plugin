# Property-Based Testing

## Core Concepts

**Generators** produce random inputs conforming to a type or constraint. The framework runs your test function against many generated inputs (typically 100+), searching for failures.

**Shrinking** reduces a failing input to the smallest case that still triggers the failure. This transforms a cryptic random failure into a minimal, debuggable reproduction.

**Properties** are assertions that hold for all valid inputs -- not just specific examples. Instead of "add(2, 3) == 5", assert "add(a, b) == add(b, a) for all integers a, b."

## Common Properties

| Property | Definition | Example |
|----------|-----------|---------|
| **Idempotency** | Applying twice equals applying once | `sort(sort(x)) == sort(x)` |
| **Roundtrip** | Encode then decode returns original | `decode(encode(x)) == x` |
| **Invariant** | Condition holds for all inputs | `len(filter(p, xs)) <= len(xs)` |
| **Commutativity** | Order of arguments doesn't matter | `merge(a, b) == merge(b, a)` |
| **Oracle comparison** | Compare against trusted implementation | `fast_sort(x) == stdlib_sort(x)` |
| **No crash** | Function handles any input without throwing | `f(arbitrary_input)` completes |
| **Metamorphic** | Related inputs produce related outputs | `search(q1 + q2) subset of search(q1)` |

## Frameworks

| Language | Framework | Generator Example |
|----------|-----------|-------------------|
| Python | Hypothesis | `@given(st.integers(), st.text())` |
| JS/TS | fast-check | `fc.property(fc.integer(), fc.string(), ...)` |
| Haskell | QuickCheck | `forAll arbitrary $ \x -> ...` |
| Elixir | PropCheck / StreamData | `forall x <- integer() do ... end` |
| Rust | proptest | `proptest! { fn test(x in 0..100) { ... } }` |
| Java | jqwik | `@ForAll int x` |

## When PBT Adds Value

**High value:**
- Parsers and serializers (roundtrip property is definitive)
- Data transformations and pipelines (invariants across stages)
- Algorithms with mathematical properties (sorting, searching, graph traversal)
- Codecs, compression, encryption (roundtrip + no crash)
- API contract validation (schema invariants hold for all payloads)

**Low value:**
- UI rendering (no clear algebraic property)
- Specific business scenarios with exact expected outputs
- Tests requiring expensive setup (database, network per invocation)

## Writing Effective Generators

1. **Start with built-in strategies** -- `integers()`, `text()`, `lists()` cover most primitive needs
2. **Constrain to valid domain** -- use `min_value`, `max_value`, `min_size`, `max_size` to avoid trivial rejections
3. **Compose for domain objects** -- build complex generators from simple ones using `builds()` or `@composite`
4. **Filter sparingly** -- `assume()` and `.filter()` discard inputs; high rejection rates slow test execution
5. **Provide explicit examples** -- use `@example()` to ensure known edge cases are always tested alongside random inputs
6. **Profile shrinking** -- if failing cases don't shrink to minimal examples, simplify the generator structure
