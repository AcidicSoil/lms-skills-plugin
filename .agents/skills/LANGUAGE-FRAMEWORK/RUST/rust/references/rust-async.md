# Rust Async

> Sources:
> - Tokio tutorial: https://tokio.rs/tokio/tutorial
> - Tokio channels: https://tokio.rs/tokio/tutorial/channels
> - Rust async book: https://rust-lang.github.io/async-book/

---

## When to Use Async

Async is for **I/O-bound** work: network, file, database, timers.
For **CPU-bound** work, use threads or `rayon` — not async.

**Do not reach for async by default.** Synchronous code is simpler to reason
about, test, and debug. Introduce async when concurrency across I/O boundaries
is actually needed.

---

## Setup

```toml
tokio = { version = "1", features = ["full"] }
```

Use `features = ["full"]` during development. Trim to specific features
(`rt`, `rt-multi-thread`, `macros`, `sync`, `time`, `io-util`) for production
to reduce compile times.

---

## Runtime

```rust
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // async entry point — macro expands to a runtime::Builder block
    Ok(())
}
```

The `#[tokio::main]` macro creates a multi-threaded runtime by default.
For single-threaded (e.g. embedded or CLI with light concurrency):

```rust
#[tokio::main(flavor = "current_thread")]
async fn main() {}
```

---

## Tasks

`tokio::spawn` creates an independent background task. The spawned future
must be `Send + 'static`.

```rust
let handle = tokio::spawn(async move {
    do_work().await
});

// Await the handle to get the result — JoinError if task panicked
let result = handle.await?;
```

**`spawn` vs `join!`:**

- `tokio::spawn` — task runs in background, can be awaited later, runs on
  any worker thread
- `tokio::join!` — concurrent on the same task, fixed number of futures,
  simpler when futures are independent and known at compile time

```rust
// join! — concurrent, same task
let (a, b) = tokio::join!(fetch_user(1), fetch_config());

// spawn — parallel across threads, dynamic number
let handles: Vec<_> = items.iter().map(|i| tokio::spawn(process(i))).collect();
for h in handles { h.await?; }
```

For a dynamic set of tasks, prefer `JoinSet`:

```rust
let mut set = tokio::task::JoinSet::new();
for item in items {
    set.spawn(process(item));
}
while let Some(result) = set.join_next().await {
    result??;
}
```

---

## Channels

Tokio channels are async-aware — `.send().await` and `.recv().await` yield
correctly, unlike `std::sync::mpsc`.

### mpsc — multi-producer, single-consumer

```rust
let (tx, mut rx) = tokio::sync::mpsc::channel(32); // bounded — choose capacity carefully

// Producer
tx.send(message).await?;

// Consumer
while let Some(msg) = rx.recv().await {
    handle(msg).await;
}
```

**Always bounded.** Unbounded channels (`mpsc::unbounded_channel`) will
consume unlimited memory under backpressure — only use when you can prove
the producer is bounded by other means.

### oneshot — single value, single consumer

```rust
let (tx, rx) = tokio::sync::oneshot::channel();
tokio::spawn(async move { tx.send(compute().await).ok(); });
let result = rx.await?;
```

Use for request/response patterns: send a `oneshot::Sender` with the
message so the handler can reply.

### broadcast — one-to-many

```rust
let (tx, _) = tokio::sync::broadcast::channel(16);
let mut rx1 = tx.subscribe();
let mut rx2 = tx.subscribe();
tx.send(event)?;
```

Receivers that fall behind lose messages — `RecvError::Lagged`. Size the
channel to tolerate the expected burst.

---

## Shared State

Prefer channels over shared state. When shared state is unavoidable:

```rust
// Wrap in Arc for shared ownership across tasks
let state = Arc::new(tokio::sync::Mutex::new(AppState::default()));

let state_clone = Arc::clone(&state);
tokio::spawn(async move {
    let mut guard = state_clone.lock().await;
    guard.update();
    // lock released here — do NOT hold across .await points if avoidable
});
```

**Rule:** never hold a `tokio::sync::Mutex` lock across an `.await` point if
the critical section can be shrunk. If the locked section must await, ensure
the mutex is Tokio's async mutex, not `std::sync::Mutex` (which blocks the
thread).

---

## Blocking Code in Async Contexts

Calling blocking code (heavy CPU work, synchronous I/O, `std::thread::sleep`)
inside an async task blocks the Tokio worker thread — starving other tasks.

Use `spawn_blocking` to offload:

```rust
let result = tokio::task::spawn_blocking(|| {
    heavy_cpu_work() // runs on a dedicated blocking thread pool
}).await?;
```

**Never use `std::thread::sleep` in async code.** Use `tokio::time::sleep`.

---

## Timeouts and Cancellation

```rust
use tokio::time::{timeout, Duration};

match timeout(Duration::from_secs(5), fetch_data()).await {
    Ok(Ok(data)) => process(data),
    Ok(Err(e)) => handle_error(e),
    Err(_) => eprintln!("timed out"),
}
```

Cancellation in Tokio is cooperative — dropping a `JoinHandle` or using
`select!` cancels the future at the next `.await` point. Use RAII guards
to ensure cleanup on cancellation.

---

## select! — race multiple futures

```rust
tokio::select! {
    result = fetch_data() => handle(result),
    _ = tokio::time::sleep(Duration::from_secs(5)) => eprintln!("timeout"),
    _ = shutdown_signal() => return Ok(()),
}
```

`select!` cancels all other branches when one completes. Ensure cancelled
futures are safe to drop mid-execution.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| `std::thread::sleep` in async | `tokio::time::sleep(...).await` |
| CPU-bound work in async task | `spawn_blocking` or `rayon` |
| `std::sync::Mutex` held across `.await` | `tokio::sync::Mutex` or restructure |
| Unbounded channels | `mpsc::channel(capacity)` — always bounded |
| `tokio::spawn` for CPU parallelism | `rayon` or `spawn_blocking` |
| Ignoring `JoinHandle` | Always `.await` handles; propagate `JoinError` |
