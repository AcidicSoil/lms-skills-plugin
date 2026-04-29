# Edge Case Heuristics

## Categories by Data Type

### Strings

| Category | Inputs | Why It Matters |
|----------|--------|---------------|
| Empty | `""`, `" "`, `"\t\n"` | May pass truthiness but fail logic |
| Null | `None`, `null`, `undefined` | TypeError on string operations |
| Null bytes | `"hello\x00world"` | Truncation in C-backed libraries, security bypass |
| Max length | `"a" * 10^6` | Performance, truncation, memory exhaustion |
| Unicode | Emoji, RTL markers, zero-width spaces, combining characters | Length miscalculation, display issues |
| Special chars | `<script>`, `'; DROP TABLE`, `../../../etc/passwd` | Injection vectors |

### Numbers

| Category | Inputs | Why It Matters |
|----------|--------|---------------|
| Zero | `0`, `0.0`, `-0.0` | Division by zero, falsy behavior, signed zero |
| Negative | `-1`, `-MAX_INT` | Off-by-one, underflow, unsigned assumptions |
| Overflow | `MAX_INT + 1`, `MAX_FLOAT * 2` | Silent wraparound, Infinity promotion |
| NaN | `float('nan')`, `NaN` | Propagation through calculations, `NaN != NaN` |
| Infinity | `float('inf')`, `-Infinity` | Comparison surprises, serialization failures |
| Precision | `0.1 + 0.2` | Float comparison issues across languages |

### Collections

| Category | Inputs | Why It Matters |
|----------|--------|---------------|
| Empty | `[]`, `{}`, `set()` | IndexError, KeyError on access |
| Single item | `[x]`, `{k: v}` | Off-by-one in iteration, boundary of "has elements" |
| Duplicates | `[1, 1, 1]`, duplicate keys | Silent overwrite, incorrect counts |
| Max size | `range(10^6)` | Performance, memory, timeout |
| Nested | `[[[[]]]]` | Recursion depth, stack overflow |
| Heterogeneous | `[1, "two", None, [3]]` | Type assumption failures |

### Dates and Times

| Category | Inputs | Why It Matters |
|----------|--------|---------------|
| Leap year | Feb 29, Feb 28 + 1 day | Date arithmetic failures |
| DST transitions | Spring forward, fall back | Lost/duplicate hours, timezone offset shifts |
| Epoch | `0` (Jan 1 1970), negative timestamps | Sentinel value confusion, pre-epoch bugs |
| Far future | Year 2038, year 9999 | 32-bit overflow, format string limits |
| Ambiguous formats | `"01/02/03"` | Locale-dependent parsing |

### Files

| Category | Inputs | Why It Matters |
|----------|--------|---------------|
| Missing | Non-existent path | FileNotFoundError, unhandled exception |
| Empty | 0-byte file | EOF on first read, empty parse result |
| Binary | Non-text content read as text | Encoding errors, garbled output |
| Permissions | Read-only, no-access, locked | PermissionError, OS-specific behavior |
| Symlinks | Circular, broken, pointing outside sandbox | Infinite loops, path traversal |

## Boundary Value Analysis

Test at the edges of equivalence classes, not the middle:

1. **Exact boundary** -- the value at the limit (e.g., `max_length`)
2. **Just inside** -- one step within valid range (`max_length - 1`)
3. **Just outside** -- one step beyond valid range (`max_length + 1`)

Apply to every numeric constraint, string length limit, array size cap, and date range. Boundaries are where off-by-one errors hide.

## Equivalence Partitioning

Divide the input space into classes where all values in a class trigger the same behavior:

1. **Valid partitions** -- groups of inputs that produce normal output
2. **Invalid partitions** -- groups of inputs that trigger error handling
3. **Select one representative** from each partition for testing
4. **Combine with boundary analysis** -- pick representatives at partition edges

Example: for a function accepting age 0-150, partitions are: negative (invalid), 0-150 (valid), >150 (invalid). Test with -1, 0, 75, 150, 151.
