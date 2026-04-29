# NumPy

## Core principle

NumPy's power is vectorization. A Python loop over array elements is a performance failure.
If you are iterating over a NumPy array with a `for` loop, stop and find the vectorized form.

## Array creation

```python
import numpy as np

# ✅ explicit dtype always
potion_potency = np.array([12.5, 0.0, 3.2], dtype=np.float32)
stronghold_ids = np.array([1, 2, 3], dtype=np.int32)
grid = np.zeros((360, 720), dtype=np.float32)
mask = np.ones((360, 720), dtype=np.bool_)

# ❌ implicit dtype — surprises at boundaries
potion_potency = np.array([12.5, 0.0, 3.2])
```

Always specify `dtype` explicitly. Float32 vs float64 matters for memory and precision.

## Vectorized operations over loops

```python
# ✅ vectorized
deviations = castings - baseline
valid = castings[castings > 0]
normalized = (castings - castings.mean()) / castings.std()

# ❌ loop
deviations = np.array([c - baseline for c in castings])
```

## Boolean indexing for filtering

```python
# ✅
valid_mask = ~np.isnan(castings) & (castings >= 0)
valid_castings = castings[valid_mask]
valid_indices = np.where(valid_mask)[0]

# ❌
valid_castings = np.array([c for c in castings if not np.isnan(c) and c >= 0])
```

## `np.nan` handling — always explicit

```python
# use nan-safe functions when NaN is possible
total = np.nansum(castings)
mean = np.nanmean(castings)
has_missing = np.any(np.isnan(castings))

# check before operations that propagate NaN silently
if np.any(np.isnan(castings)):
    raise MissingDataError("castings contain NaN values")
```

## Axis operations

```python
# always name the axis — never rely on default
daily_total = hourly_data.sum(axis=0)       # sum over time axis
regional_mean = grid_data.mean(axis=(1, 2)) # mean over lat/lon axes
```

## Broadcasting — use intentionally, never accidentally

```python
# ✅ explicit shape alignment
baseline = np.array([10.0, 20.0, 30.0])          # shape (3,)
grid = np.random.rand(100, 3)                      # shape (100, 3)
deviations = grid - baseline                       # broadcasts correctly

# document non-obvious broadcasting with a comment on shape
weights = weights[:, np.newaxis]  # shape (N,) -> (N, 1) for broadcasting over columns
```

## Memory layout — C vs Fortran order

```python
# default C order (row-major) — iterate over last axis fastest
grid = np.zeros((lat, lon), dtype=np.float32, order="C")

# use Fortran order only when interfacing with Fortran-order libraries
grid_f = np.asfortranarray(grid)
```

## `np.einsum` for complex tensor operations

```python
# matrix multiply with explicit indices — clearer than @ for non-standard axes
result = np.einsum("ij,jk->ik", matrix_a, matrix_b)
# weighted sum over realm dimensions
weighted = np.einsum("tyx,yx->t", data, weights)
```

## `np.testing` for array assertions in tests

```python
import numpy as np

np.testing.assert_array_equal(result, expected)
np.testing.assert_allclose(result, expected, rtol=1e-5)
np.testing.assert_array_less(result, upper_bound)
```

Never use `==` for array comparison in tests — use `np.testing`.

## Do not

- Loop over array elements — find the vectorized form.
- Use implicit dtypes — always specify.
- Use `np.matrix` — use 2D `np.ndarray`.
- Mutate arrays passed as arguments — return new arrays.
- Use `==` to compare floats — use `np.isclose` or `np.allclose`.
- Use `np.float` / `np.int` — deprecated, use `np.float64` / `np.int64` or Python builtins.
