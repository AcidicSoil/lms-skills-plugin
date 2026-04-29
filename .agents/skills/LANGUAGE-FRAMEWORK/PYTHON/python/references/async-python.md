# Async Python 3.12+

## Core model

Python async is cooperative multitasking on a single thread.
It excels at I/O-bound concurrency (network, filesystem, database).
It does not parallelize CPU-bound work — use `ProcessPoolExecutor` for that.

## TaskGroup — the 3.12+ standard for concurrent tasks (PEP 659 / 3.11+)

Prefer `asyncio.TaskGroup` over `asyncio.gather`. It cancels all sibling tasks on failure.

```python
async def fetch_all_strongholds(stronghold_ids: list[str]) -> list[StrongholdData]:
    """Fetch data for all strongholds concurrently, failing fast on any error."""
    results = []
    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(fetch_stronghold(sid)) for sid in stronghold_ids]
    return [task.result() for task in tasks]
```

`gather` swallows exceptions by default. `TaskGroup` does not. Use `TaskGroup`.

## Structured concurrency — always use context managers

```python
# ✅ resources are always cleaned up
async with aiohttp.ClientSession() as session:
    async with session.get(url) as response:
        data = await response.json()

# ❌ manual cleanup is error-prone
session = aiohttp.ClientSession()
response = await session.get(url)
data = await response.json()
await session.close()
```

## asyncio.timeout (3.11+) — prefer over wait_for

```python
async def fetch_with_deadline(url: str) -> bytes:
    """Fetch URL content, raising TimeoutError after 30 seconds."""
    async with asyncio.timeout(30):
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                return await response.read()
```

## Async generators for streaming pipelines

```python
async def read_guild_records(path: Path) -> AsyncIterator[GuildRecord]:
    """Stream guild records from file without loading all into memory."""
    async with aiofiles.open(path) as f:
        async for line in f:
            yield parse_record(line.strip())

async def process_pipeline() -> None:
    """Process guild records as a streaming pipeline."""
    async for record in read_guild_records(Path("guilds.jsonl")):
        await store_record(record)
```

## Semaphore for rate limiting concurrent I/O

```python
async def download_all(urls: list[str], max_concurrent: int = 10) -> list[bytes]:
    """Download all URLs with bounded concurrency."""
    semaphore = asyncio.Semaphore(max_concurrent)

    async def download_one(url: str) -> bytes:
        async with semaphore:
            return await fetch(url)

    async with asyncio.TaskGroup() as group:
        tasks = [group.create_task(download_one(url)) for url in urls]
    return [task.result() for task in tasks]
```

## CPU-bound work — offload to executor

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

async def compute_enchantment_scores(castings: list[float]) -> list[float]:
    """Compute enchantment scores without blocking the event loop."""
    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor() as executor:
        return await loop.run_in_executor(executor, _compute_sync, castings)

def _compute_sync(castings: list[float]) -> list[float]:
    """CPU-bound enchantment scoring — runs in subprocess."""
    ...
```

## Entry point

```python
import asyncio

async def main() -> None:
    """Pipeline entry point."""
    await run_pipeline()

if __name__ == "__main__":
    asyncio.run(main())
```

## Do not

- Mix sync and async I/O — pick one per layer.
- Use `asyncio.gather` with `return_exceptions=False` — use `TaskGroup` instead.
- Use `asyncio.sleep(0)` as a yield point hack — structure the code properly.
- Run `asyncio.run()` inside an already-running event loop.
- Block the event loop with sync I/O (`open()`, `requests.get()`) inside async functions.
- Use `loop.run_until_complete()` — use `asyncio.run()` at the top level.
