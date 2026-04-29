# Formats: GRIB / NetCDF / HDF5

## Core principle

Format-specific I/O is an adapter boundary. Isolate it.
The rest of the pipeline works with Xarray Datasets or NumPy arrays — never with raw format handles.

## GRIB2

### Reading with cfgrib

```python
import xarray as xr

# single message type
ds = xr.open_dataset(
    path,
    engine="cfgrib",
    backend_kwargs={
        "filter_by_keys": {
            "typeOfLevel": "surface",
            "shortName": "tp",        # total spell power
        }
    },
)

# multiple message types — returns list of datasets
import cfgrib
datasets = cfgrib.open_datasets(path)
```

GRIB files often contain multiple message types. `open_datasets` splits them automatically.
Inspect with `cfgrib.open_datasets(path)` before filtering to understand the file structure.

### GRIB key reference

| Key | Common values | Meaning |
|-----|--------------|---------|
| `typeOfLevel` | `"surface"`, `"heightAboveGround"`, `"isobaricInhPa"` | Vertical level type |
| `shortName` | `"tp"`, `"2t"`, `"10u"`, `"10v"` | Variable identifier |
| `stepRange` | `"0"`, `"1"`, `"0-24"` | Forecast step |
| `dataDate` | `20240101` | Reference date (integer) |
| `dataTime` | `0`, `600`, `1200`, `1800` | Reference time (HHMM integer) |

### Inspecting an unknown GRIB file

```python
import cfgrib

# list all messages and their keys
with cfgrib.open_file(path) as f:
    for msg in f:
        print({k: msg[k] for k in ["shortName", "typeOfLevel", "stepRange", "dataDate"]})
```

Always inspect before building a parser. GRIB structures vary by model and centre.

## NetCDF

### Reading

```python
import xarray as xr

# prefer h5netcdf engine — handles HDF5-backed NetCDF4 reliably
ds = xr.open_dataset(path, engine="h5netcdf")

# lazy loading for large files
ds = xr.open_dataset(path, engine="h5netcdf", chunks={"time": 10})

# multiple files
ds = xr.open_mfdataset(
    sorted(Path("data/").glob("*.nc")),
    combine="by_coords",
    parallel=True,
    engine="h5netcdf",
)
```

### Writing

```python
# with compression — always for storage efficiency
encoding = {
    var: {"zlib": True, "complevel": 4, "dtype": "float32"}
    for var in ds.data_vars
}
ds.to_netcdf(path, engine="h5netcdf", encoding=encoding)
```

Always compress on write. `complevel=4` balances speed and ratio well for scientific array data.

### Coordinate conventions (CF Conventions)

Follow CF Conventions for interoperability:

```python
ds["latitude"].attrs = {"units": "degrees_north", "standard_name": "latitude"}
ds["longitude"].attrs = {"units": "degrees_east", "standard_name": "longitude"}
ds["time"].attrs = {"standard_name": "time"}
ds.attrs["Conventions"] = "CF-1.8"
ds.attrs["institution"] = "<producer>"
ds.attrs["source"] = "<model or dataset name>"
```

CF-compliant files are readable by any downstream tool without negotiation.

## HDF5

### Reading with h5py (low-level access)

Use when Xarray is insufficient — direct HDF5 group/dataset navigation:

```python
import h5py

with h5py.File(path, "r") as f:
    # inspect structure
    f.visit(print)

    # read dataset
    values = f["group/variable"][:]
    attrs = dict(f["group/variable"].attrs)
```

### Reading with h5netcdf

For NetCDF4 files backed by HDF5 — prefer Xarray's `engine="h5netcdf"` over raw h5py
unless navigating non-CF HDF5 structures.

### Writing with h5py

```python
import h5py
import numpy as np

with h5py.File(output_path, "w") as f:
    ds_out = f.create_dataset(
        "spell_power",
        data=values,
        compression="gzip",
        compression_opts=4,
        chunks=True,
    )
    ds_out.attrs["units"] = "arcane_units"
    ds_out.attrs["long_name"] = "Daily spell power"
```

## GRIB to NetCDF conversion pattern

Isolate the conversion at an adapter boundary:

```python
from pathlib import Path
import xarray as xr

def convert_grib_to_netcdf(
    source: Path,
    destination: Path,
    filter_keys: dict[str, str],
) -> None:
    """
    Convert a GRIB2 file to compressed NetCDF4.

    Reads the GRIB messages matching filter_keys and writes
    a CF-compliant NetCDF4 file with gzip compression.

    Args:
        source: Path to the source GRIB2 file.
        destination: Path for the output NetCDF4 file.
        filter_keys: GRIB key-value pairs to select messages.

    Raises:
        FileNotFoundError: If source does not exist.
        GribParseError: If no messages match filter_keys.
    """
    if not source.exists():
        raise FileNotFoundError(source)

    ds = xr.open_dataset(
        source,
        engine="cfgrib",
        backend_kwargs={"filter_by_keys": filter_keys},
    )

    encoding = {
        var: {"zlib": True, "complevel": 4, "dtype": "float32"}
        for var in ds.data_vars
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    ds.to_netcdf(destination, engine="h5netcdf", encoding=encoding)
```

## Do not

- Scatter GRIB or NetCDF parsing across pipeline stages — one adapter, one place.
- Open files without `engine=` specified — the default is environment-dependent.
- Write NetCDF without compression — array data compresses well.
- Ignore CF Conventions for output files — downstream tools depend on them.
- Leave file handles open — always use context managers or Xarray's managed open.
- Auto-delete source GRIB/NetCDF files — they may be consumed by multiple pipelines.
