# DuckDB

## Core principle

DuckDB is an embedded analytical query engine. No server, no setup — runs in-process.
Use it for analytical queries on files (Parquet, CSV, JSON) and in-memory DataFrames
that would be slow or awkward with Pandas/NumPy alone.

## Standalone engine — default choice

DuckDB runs entirely in-process. No daemon, no connection string, no infrastructure.

```python
import duckdb

# in-memory database — default, ephemeral
conn = duckdb.connect()

# persistent database — writes to file
conn = duckdb.connect("analytics.duckdb")
```

Always close connections explicitly or use context managers:

```python
with duckdb.connect("analytics.duckdb") as conn:
    result = conn.execute("SELECT count(*) FROM 'data/*.parquet'").fetchall()
```

## Querying files directly — no loading needed

DuckDB reads Parquet, CSV, JSON, and glob patterns natively:

```python
# query Parquet files directly
conn.execute("SELECT stronghold_id, SUM(value) FROM 'data/*.parquet' GROUP BY stronghold_id")

# query with Python f-string for dynamic paths
result = conn.execute(f"SELECT * FROM read_parquet('{path}')").df()

# glob across partitioned directories
result = conn.execute(
    "SELECT * FROM read_parquet('data/year=*/month=*/*.parquet')"
).df()
```

## Integration with Pandas and NumPy

DuckDB registers DataFrames as virtual tables automatically:

```python
import pandas as pd
import duckdb

df = pd.read_parquet("source.parquet")

# query the DataFrame directly — zero copy
result = duckdb.query("SELECT stronghold_id, AVG(value) FROM df GROUP BY stronghold_id").df()

# register explicitly for reuse
conn.register("measurements", df)
result = conn.execute("SELECT * FROM measurements WHERE value > 10").df()
```

`.df()` returns a Pandas DataFrame. `.fetchnumpy()` returns a dict of NumPy arrays.
`.fetchall()` returns a list of tuples. Use `.df()` unless you have a specific reason.

## Integration with Xarray / Arrow

```python
import pyarrow as pa

# to Arrow — zero copy where possible
arrow_table = conn.execute("SELECT * FROM source").arrow()

# from Arrow
conn.register("arrow_data", arrow_table)
```

## Writing results

```python
# write query result directly to Parquet
conn.execute("COPY (SELECT * FROM source WHERE value > 0) TO 'output.parquet' (FORMAT PARQUET)")

# with compression
conn.execute("""
    COPY (SELECT * FROM source)
    TO 'output.parquet'
    (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)
""")
```

## Analytical patterns

```python
# window functions
conn.execute("""
    SELECT
        stronghold_id,
        timestamp,
        value,
        AVG(value) OVER (
            PARTITION BY stronghold_id
            ORDER BY timestamp
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS rolling_7d_avg
    FROM measurements
""")

# ASOF join — nearest timestamp match
conn.execute("""
    SELECT m.*, r.reference_value
    FROM measurements m
    ASOF JOIN reference r
    ON m.stronghold_id = r.stronghold_id AND m.timestamp >= r.timestamp
""")

# PIVOT
conn.execute("""
    PIVOT measurements
    ON month
    USING SUM(value)
    GROUP BY stronghold_id
""")
```

## Python client — duckdb package

```python
# install
# pip install duckdb

import duckdb

# version check
print(duckdb.__version__)

# recommended: one connection per thread for concurrent use
conn = duckdb.connect()
conn.execute("SET threads TO 4")
conn.execute("SET memory_limit = '4GB'")
```

## Rust client — duckdb-rs

```toml
# Cargo.toml
[dependencies]
duckdb = { version = "1", features = ["bundled"] }
```

```rust
use duckdb::{Connection, Result};

fn query_parquet(path: &str) -> Result<Vec<(String, f64)>> {
    let conn = Connection::open_in_memory()?;
    let mut stmt = conn.prepare(
        &format!("SELECT stronghold_id, AVG(value) FROM '{}' GROUP BY stronghold_id", path)
    )?;
    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
    rows.collect()
}
```

Use `features = ["bundled"]` to embed DuckDB — no system library dependency.

## Performance settings

```python
conn.execute("SET threads TO 8")               # default: all cores
conn.execute("SET memory_limit = '8GB'")       # default: 80% of RAM
conn.execute("SET temp_directory = '/tmp'")    # spill to disk when needed
conn.execute("PRAGMA enable_progress_bar")     # for long queries in CLI
```

## Do not

- Use DuckDB for OLTP (row-level inserts/updates at high frequency) — it is analytical.
- Open multiple write connections to the same `.duckdb` file concurrently.
- Use string concatenation for user-supplied values in queries — use prepared statements.
- Load large files into Pandas first just to query them — query the files directly.
- Ignore connection lifecycle — always close or use context managers.
