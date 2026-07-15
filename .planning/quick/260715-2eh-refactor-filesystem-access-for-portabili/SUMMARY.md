---
quick_id: 260715-2eh
status: complete
completed: 2026-07-15
commits:
  - b41245b
  - 08a0179
---

# Native WSL Filesystem Refactor

Replaced WSL subprocess-based skill traversal and workspace filesystem operations with Node native filesystem APIs.

## Completed

- Added strict Linux-path to `\\wsl$` UNC mapping with distribution validation.
- Kept Linux paths as user/model-facing display paths while using host-visible native paths for I/O.
- Replaced WSL `find`, `cat`, `tee`, `mkdir`, `rm`, `mv`, `test`, and `realpath` filesystem subprocesses.
- Preserved `wsl.exe` for explicit Linux command execution.
- Retained one cached `printenv HOME` boundary call only for legacy `~/...` skill-root configuration; absolute Linux roots require no discovery process.
- Added dependency-injected path mapping so WSL behavior is testable on non-Windows CI hosts.

## Verification

- `npm test`: 82 tests passed, 0 failed.
- `npm run build`: TypeScript compilation passed.
- WSL skill scanning/read/list tests assert zero subprocess calls for absolute roots.
- WSL workspace lifecycle tests assert zero subprocess calls for filesystem operations.

## Remaining boundary

Legacy tilde-prefixed WSL skill roots still need a single cached HOME-resolution command. Eliminating that final boundary requires either migration to persisted absolute Linux roots or a separately validated default-user discovery mechanism.
