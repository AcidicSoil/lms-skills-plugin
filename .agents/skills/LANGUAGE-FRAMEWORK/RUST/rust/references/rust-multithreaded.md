# Rust Multithreaded

> Sources:
> - The Rust Book ch.16: https://doc.rust-lang.org/book/ch16-00-concurrency.html
> - Rayon: https://docs.rs/rayon
> - std::sync: https://doc.rust-lang.org/std/sync/

---

## Thread vs Async — The Right Tool

| Workload | Use |
|---|---|
| CPU-bound (heavy computation, parsing, compression) | `std::thread` + `rayon` |
| I/O-bound (network, file, database) | `tokio` async |
| Mixed | `tokio::spawn_blocking` for CPU work inside async |

**Never** use threads to parallelize I/O-bound work — use async.
**Never** use async for CPU-bound work — it starves the runtime.

---

## Thread Spawning

```rust
use std::thread;

let handle = thread::spawn(move || {
    // closure must own its data (move)
    compute()
});

let result = handle.join().expect("thread panicked");
```

- `join()` blocks until the thread finishes and returns `Result<T, Box<dyn Any>>`
- The error case is a panic — propagate it explicitly
- Collect `JoinHandle`s and join all of them; dropping a handle detaches the
  thread (it keeps running but you lose the result)

---

## Send and Sync

The compiler enforces thread safety through two marker traits:

- `Send` — safe to transfer ownership to another thread
- `Sync` — safe to share a reference across threads (`&T` is `Send` iff
  `T: Sync`)

Most standard types implement both. Notable exceptions:
- `Rc<T>` — not `Send` (use `Arc<T>`)
- `RefCell<T>` — not `Sync` (use `Mutex<T>`)
- Raw pointers — neither

---

## Arc — Shared Ownership Across Threads

`Arc<T>` is the thread-safe version of `Rc<T>`. Use it when multiple threads
need to own the same data.

```rust
use std::sync::Arc;

let data = Arc::new(vec![1, 2, 3]);
let data_clone = Arc::clone(&data);

thread::spawn(move || {
    println!("{:?}", data_clone);
});
```

`Arc` alone is immutable. Combine with `Mutex` or `RwLock` for mutation.

---

## Mutex — Exclusive Access

```rust
use std::sync::{Arc, Mutex};

let counter = Arc::new(Mutex::new(0u32));

let handles: Vec<_> = (0..8).map(|_| {
    let c = Arc::clone(&counter);
    thread::spawn(move || {
        let mut guard = c.lock().unwrap();
        *guard += 1;
        // guard drops here — lock released
    })
}).collect();

for h in handles { h.join().unwrap(); }
```

**Rules:**
- Keep the critical section as short as possible — drop the guard as soon as
  the mutation is done
- Never hold a lock across a blocking call or sleep
- `lock()` returns `Err` if a previous holder panicked (poisoned mutex) —
  decide whether to propagate or recover with `into_inner()`

**Deadlock prevention:** always acquire multiple locks in the same order
across all threads. Document the lock ordering in code.

---

## RwLock — Many Readers or One Writer

```rust
use std::sync::RwLock;

let data = Arc::new(RwLock::new(vec![1, 2, 3]));

// Multiple concurrent readers
let r = data.read().unwrap();
println!("{:?}", *r);
drop(r); // release before writing

// Single writer
let mut w = data.write().unwrap();
w.push(4);
```

Use `RwLock` when reads significantly outnumber writes. If writes are
frequent, `Mutex` is often faster due to lower overhead.

---

## Channels — Prefer Message Passing Over Shared State

```rust
use std::sync::mpsc;

let (tx, rx) = mpsc::channel();

thread::spawn(move || {
    tx.send(compute()).unwrap();
});

let result = rx.recv().unwrap();
```

For multiple producers:

```rust
let tx2 = tx.clone(); // clone the sender, not the receiver
```

**Prefer channels over `Arc<Mutex<T>>`** when:
- Data flows in one direction
- You want to avoid lock contention
- You can model the problem as producer/consumer

---

## Rayon — Data Parallelism

Rayon provides parallel iterators that split work across a thread pool
automatically. The default pool size equals the number of logical CPUs.

```rust
use rayon::prelude::*;

// Sequential
let sum: u64 = (0..1_000_000u64).map(|x| x * x).sum();

// Parallel — just change iter() to par_iter()
let sum: u64 = (0..1_000_000u64).into_par_iter().map(|x| x * x).sum();
```

**When to use `par_iter`:**
- Collection size is large enough that parallelism overhead pays off (rule of
  thumb: >10k elements or >1ms per element)
- Operations are independent — no shared mutable state between items
- Operations are CPU-bound — parallel I/O with rayon is counterproductive

```rust
// Process files in parallel
results = files
    .par_iter()
    .map(|f| process_file(f))
    .collect::<Result<Vec<_>, _>>()?;
```

**Custom thread pool** (when you need to isolate parallelism):

```rust
let pool = rayon::ThreadPoolBuilder::new()
    .num_threads(4)
    .build()
    .unwrap();

pool.install(|| {
    data.par_iter().for_each(|item| process(item));
});
```

---

## Atomics — Lock-Free Simple State

For simple counters or flags, atomics avoid lock overhead entirely:

```rust
use std::sync::atomic::{AtomicU64, Ordering};

static COUNTER: AtomicU64 = AtomicU64::new(0);
COUNTER.fetch_add(1, Ordering::Relaxed);
```

**Ordering guide (simplified):**
- `Relaxed` — no ordering guarantees, just atomicity. Safe for counters.
- `SeqCst` — full sequential consistency. Safest, highest cost. Default when
  unsure.
- `Acquire`/`Release` — for lock-like patterns. Use together.

---

## Anti-Patterns

| Anti-pattern | Correct approach |
|---|---|
| `Rc<T>` across threads | `Arc<T>` |
| `RefCell<T>` across threads | `Mutex<T>` or `RwLock<T>` |
| Holding lock across blocking calls | Minimize critical section; release before blocking |
| Acquiring locks in inconsistent order | Document and enforce a lock hierarchy |
| `rayon` for I/O-bound work | `tokio` async |
| Spawning a thread per task | Rayon pool or `tokio::spawn` |
| Ignoring `JoinHandle` return value | Always join and handle panics |
