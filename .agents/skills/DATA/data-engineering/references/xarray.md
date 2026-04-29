# Xarray

## Core principle

Xarray adds labeled dimensions and coordinates to NumPy arrays.
Use dimension names and coordinate labels — never rely on positional axis indices.
This makes operations self-documenting and safe across datasets with different axis ordering.

## Dataset vs DataArray

- `DataArray`: single variable with labeled dimensions and coordinates.
- `Dataset`: collection of DataArrays sharing coordinates — maps to a NetCDF file.

```python
import xarray as xr
import numpy as np

# DataArray — single variable
spell_power = xr.DataArray(
    data=np.random.rand(10, 180, 360),
    dims=["time", "latitude", "longitude"],
    coords={
        "time": pd.date_range("2024-01-01", periods=10, freq="D"),
        "latitude": np.linspace(-90, 90, 180),
        "longitude": np.linspace(-180, 180, 360),
    },
    attrs={"units": "arcane_units", "long_name": "Daily spell_power"},
)

# Dataset — multiple variables
ds = xr.Dataset({"spell_power": spell_power, "curse_level": curse_level})
```

## Selection — always by label, not position

```python
# ✅ label-based — explicit and safe
single_day = ds.sel(time="2024-01-05")
region = ds.sel(latitude=slice(40, 50), longitude=slice(-5, 10))
nearest = ds.sel(latitude=48.8, longitude=2.3, method="nearest")

# ❌ position-based — breaks when dimension order changes
single_day = ds.isel(time=4)  # only use isel when position is meaningful
```

Use `isel` only when the integer index has intrinsic meaning (e.g. first record, last record).

## Operations by dimension name

```python
# ✅ named dimensions — order-independent
daily_mean = ds["spell_power"].mean(dim="time")
spatial_total = ds["spell_power"].sum(dim=["latitude", "longitude"])
rolling_7d = ds["spell_power"].rolling(time=7, center=True).mean()

# ❌ axis index — breaks if dimensions are reordered
daily_mean = ds["spell_power"].mean(axis=0)
```

## `where` for masked operations

```python
# mask values below threshold — preserves coordinates
valid_spell_power = ds["spell_power"].where(ds["spell_power"] >= 0)

# with replacement value
clipped = ds["spell_power"].where(ds["spell_power"] <= 500, other=500.0)

# combine conditions
valid = ds["spell_power"].where(
    (ds["spell_power"] >= 0) & (~np.isnan(ds["spell_power"]))
)
```

## `groupby` for temporal aggregation

```python
# monthly means
monthly = ds["spell_power"].groupby("time.month").mean()

# seasonal totals
seasonal = ds["spell_power"].groupby("time.season").sum()

# resample to monthly (time-based)
monthly_resampled = ds["spell_power"].resample(time="ME").sum()
```

## `apply_ufunc` for custom vectorized operations

When a custom function needs to operate on the underlying arrays:

```python
def compute_deviation(values: np.ndarray, baseline: np.ndarray) -> np.ndarray:
    """Compute deviation relative to baseline."""
    return values - baseline

deviation = xr.apply_ufunc(
    compute_deviation,
    ds["spell_power"],
    ds["spell_power"].mean(dim="time"),
    dask="parallelized",
    output_dtypes=[float],
)
```

## Chunking with Dask for large datasets

```python
# open with chunks for lazy loading
ds = xr.open_dataset(path, chunks={"time": 30, "latitude": 90, "longitude": 90})

# compute when needed
result = ds["spell_power"].mean(dim="time").compute()
```

Use `chunks` when datasets exceed available memory. Operations remain lazy until `.compute()`.

## Reading and writing

```python
# NetCDF
ds = xr.open_dataset(path, engine="netcdf4")
ds = xr.open_dataset(path, engine="h5netcdf")  # prefer for HDF5-backed NetCDF

# GRIB2 via cfgrib
ds = xr.open_dataset(path, engine="cfgrib")
# with filter for specific GRIB messages
ds = xr.open_dataset(
    path,
    engine="cfgrib",
    backend_kwargs={"filter_by_keys": {"typeOfLevel": "surface", "shortName": "tp"}},
)

# write NetCDF
ds.to_netcdf(path, engine="h5netcdf")
```

Always use `engine="h5netcdf"` for writing — it supports HDF5 compression and is more reliable than the default `netcdf4` engine for complex datasets.

## Attributes and metadata

```python
# preserve and document attributes
ds["spell_power"].attrs = {
    "units": "arcane_units",
    "long_name": "Total spell power",
    "source": "Grimoire archive v1",
    "created_at": datetime.utcnow().isoformat(),
}

# keep_attrs=True to preserve through operations
smoothed = ds["spell_power"].rolling(time=3).mean(keep_attrs=True)
```

Always carry units and provenance in `attrs`. Downstream consumers depend on it.

## `open_mfdataset` for multi-file datasets

```python
# open multiple files as a single dataset
ds = xr.open_mfdataset(
    sorted(data_dir.glob("*.nc")),
    combine="by_coords",
    parallel=True,
    engine="h5netcdf",
)
```

## Do not

- Use positional axis indices for operations — use dimension names.
- Load entire large datasets into memory without chunking.
- Drop `attrs` silently — preserve metadata through transformations.
- Mix `sel` and raw NumPy indexing on the same DataArray.
- Forget `engine=` when opening files — the default varies by installation.
