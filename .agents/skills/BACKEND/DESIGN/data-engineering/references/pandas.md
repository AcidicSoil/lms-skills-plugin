# Pandas

## Core principle

Pandas is for tabular data and time series. Use vectorized operations and method chaining.
Avoid iterating over rows — it defeats the purpose of the library.

## DataFrame creation — explicit dtypes

```python
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "stronghold_id": pd.array(["A001", "A002", "A003"], dtype="string"),
    "potion_supply": pd.array([12.5, np.nan, 3.2], dtype="Float64"),
    "timestamp": pd.to_datetime(["2024-01-01", "2024-01-02", "2024-01-03"]),
    "is_valid": pd.array([True, False, True], dtype="boolean"),
})
```

Use nullable dtypes (`"Int64"`, `"Float64"`, `"boolean"`, `"string"`) over NumPy dtypes
when NaN is possible. They distinguish `NaN` (missing) from `0` or `False`.

## Method chaining over intermediate variables

```python
# ✅ chain — reads as a pipeline
result = (
    df
    .dropna(subset=["potion_supply"])
    .query("potion_supply > 0")
    .assign(supply_normalized=lambda d: d["potion_supply"] / d["potion_supply"].max())
    .groupby("stronghold_id")
    .agg(total=("supply_normalized", "sum"))
    .reset_index()
)

# ❌ intermediate variables — harder to follow the transformation
df1 = df.dropna(subset=["potion_supply"])
df2 = df1[df1["potion_supply"] > 0]
df3 = df2.copy()
df3["supply_normalized"] = df3["potion_supply"] / df3["potion_supply"].max()
```

## `.assign()` over direct column mutation

```python
# ✅ returns new DataFrame, does not mutate
df = df.assign(
    deviation=lambda d: d["potion_supply"] - d["potion_supply"].mean(),
    is_above_threshold=lambda d: d["potion_supply"] > threshold,
)

# ❌ mutates in place — harder to reason about in pipelines
df["deviation"] = df["potion_supply"] - df["potion_supply"].mean()
```

## `.query()` for readable filtering

```python
# ✅
valid = df.query("potion_supply > 0 and is_valid == True")
recent = df.query("timestamp >= '2024-01-01'")

# ❌
valid = df[(df["potion_supply"] > 0) & (df["is_valid"] == True)]
```

## Time series — always use `DatetimeTZDtype`

```python
# ✅ timezone-aware always
df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)

# set as index for time series operations
ts = df.set_index("timestamp").sort_index()

# resample
daily = ts.resample("D")["potion_supply"].sum()
monthly = ts.resample("ME")["potion_supply"].mean()
```

Never store timestamps as strings or naive datetimes.

## `groupby` + `agg` for aggregations

```python
# ✅ named aggregations — explicit output column names
summary = (
    df.groupby("stronghold_id")
    .agg(
        total_supply=("potion_supply", "sum"),
        mean_supply=("potion_supply", "mean"),
        casting_count=("potion_supply", "count"),
    )
    .reset_index()
)
```

## Avoid iteration — use vectorized alternatives

```python
# ❌ never
for idx, row in df.iterrows():
    df.at[idx, "deviation"] = row["potion_supply"] - baseline

# ✅
df = df.assign(deviation=df["potion_supply"] - baseline)
```

If you think you need `iterrows`, you need `.apply`, `.assign`, or a vectorized NumPy operation instead.

## `.copy()` — explicit when needed

Pandas slices return views in some cases, copies in others. Be explicit:

```python
subset = df[df["is_valid"]].copy()  # explicit copy — safe to mutate
```

## Reading and writing

```python
# always specify dtypes on read
df = pd.read_csv(
    path,
    dtype={"stronghold_id": "string", "potion_supply": "Float64"},
    parse_dates=["timestamp"],
)

# parquet for intermediate storage — preserves dtypes
df.to_parquet(path, index=False)
df = pd.read_parquet(path)
```

Prefer Parquet over CSV for pipeline intermediate storage — faster, typed, compressed.

## Do not

- Use `df.iterrows()` or `df.itertuples()` for transformations.
- Mutate a DataFrame passed as an argument — return a new one.
- Use `inplace=True` — it does not save memory and makes chaining impossible.
- Use `df.values` — use `df.to_numpy()` for explicit NumPy conversion.
- Use object dtype for strings — use `"string"` dtype.
- Store timestamps without timezone information.
