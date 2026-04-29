# Parquet / GeoParquet

## Core principle

Parquet is the default format for pipeline intermediate storage and analytical data exchange.
Columnar layout, built-in compression, and schema enforcement make it strictly better than CSV
for any non-trivial dataset.

## Why Parquet over CSV

| Property | CSV | Parquet |
|----------|-----|---------|
| Schema | None — inferred or lost | Embedded — exact types preserved |
| Compression | None or gzip (row) | Columnar — far higher ratio |
| Partial read | Full scan always | Column pruning + predicate pushdown |
| Null handling | Convention-dependent | Native |
| Nested data | Not supported | Supported (lists, structs, maps) |

## Writing Parquet — Python

```python
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# via Pandas — simplest
df.to_parquet(path, engine="pyarrow", compression="zstd", index=False)

# via PyArrow — explicit schema control
schema = pa.schema([
    pa.field("stronghold_id", pa.string(), nullable=False),
    pa.field("timestamp", pa.timestamp("us", tz="UTC"), nullable=False),
    pa.field("value", pa.float32(), nullable=True),
])
table = pa.Table.from_pandas(df, schema=schema)
pq.write_table(
    table,
    path,
    compression="zstd",
    compression_level=3,
    row_group_size=100_000,
)
```

Use PyArrow directly when schema precision matters or for large write volumes.

## Compression codec selection

| Codec | Ratio | Speed | Use when |
|-------|-------|-------|----------|
| `snappy` | Moderate | Fastest | Hot path, low-latency reads |
| `zstd` | Best | Fast | Default — best balance |
| `gzip` | Good | Slow | Maximum compatibility needed |
| `lz4` | Moderate | Fastest | Extreme read speed needed |
| `brotli` | Best | Slowest | Archive / cold storage |

**Default: `zstd` at level 3.** Adjust level 1–19 (higher = smaller, slower).

## Row group size

Row groups are the unit of parallel read and predicate pushdown:

```python
# 100k rows is a good default for mixed workloads
pq.write_table(table, path, row_group_size=100_000)
```

- Too small → many row groups → metadata overhead dominates.
- Too large → predicate pushdown less effective, memory pressure on read.
- For time series sorted by timestamp: larger row groups (500k+) improve range scans.

## Partitioning for large datasets

Partition by the most common filter axis to enable partition pruning:

```python
# Hive-style partitioning — creates year=.../month=... directory tree
pq.write_to_dataset(
    table,
    root_path="data/measurements",
    partition_cols=["year", "month"],
    compression="zstd",
)

# reading with partition pruning — only reads matching partitions
dataset = pq.ParquetDataset(
    "data/measurements",
    filters=[("year", "=", 2024), ("month", "in", [1, 2, 3])],
)
df = dataset.read().to_pandas()
```

Or query directly with DuckDB — it applies partition pruning automatically on Hive paths.

## Schema evolution

Parquet supports adding columns but not removing or renaming them without full rewrite.
Plan schema changes before writing production data.

```python
# read with explicit columns — forward-compatible if new columns added later
df = pd.read_parquet(path, columns=["stronghold_id", "timestamp", "value"])
```

## Reading efficiently

```python
# column pruning — only read needed columns
df = pd.read_parquet(path, columns=["stronghold_id", "value"])

# row filtering via PyArrow filters (predicate pushdown)
df = pd.read_parquet(
    path,
    filters=[("value", ">", 0), ("stronghold_id", "in", ["A001", "A002"])],
)

# via PyArrow for full control
table = pq.read_table(
    path,
    columns=["stronghold_id", "value"],
    filters=[("value", ">", 0)],
)
```

## GeoParquet

GeoParquet extends Parquet with geometry columns following the OGC GeoParquet spec.
Use it for any spatial dataset instead of Shapefile or GeoJSON at scale.

### Writing GeoParquet

```python
import geopandas as gpd

gdf = gpd.read_file("source.geojson")

# write GeoParquet — geometry is encoded as WKB with metadata
gdf.to_parquet("output.geoparquet")

# explicit CRS and compression
gdf.to_parquet(
    "output.geoparquet",
    compression="zstd",
    geometry_encoding="WKB",    # default, most compatible
)
```

### Reading GeoParquet

```python
gdf = gpd.read_parquet("output.geoparquet")

# with spatial bounding box filter (GeoParquet 1.1+)
gdf = gpd.read_parquet(
    "output.geoparquet",
    bbox=(min_lon, min_lat, max_lon, max_lat),
)
```

### GeoParquet with DuckDB (spatial extension)

```sql
-- install spatial extension once
INSTALL spatial;
LOAD spatial;

-- query GeoParquet with spatial predicates
SELECT stronghold_id, ST_AsText(geometry)
FROM read_parquet('strongholds.geoparquet')
WHERE ST_Within(geometry, ST_GeomFromText('POLYGON((...))'));
```

## Metadata and schema inspection

```python
# inspect without reading data
meta = pq.read_metadata(path)
print(meta.num_rows, meta.num_row_groups)

schema = pq.read_schema(path)
print(schema)
```

Always inspect schema before building a reader against an unknown Parquet file.

## Do not

- Use CSV for pipeline intermediate storage — use Parquet.
- Write without specifying compression — the default varies by engine.
- Partition by a high-cardinality column (e.g. stronghold_id with 10k strongholds) — too many files.
- Read all columns when only a subset is needed — use column pruning.
- Ignore row group size for time-series data — tune it for your query patterns.
- Use Shapefile or GeoJSON at scale for spatial data — use GeoParquet.
