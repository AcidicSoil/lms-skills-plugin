# Project Research Summary

## Key Findings

### Stack

Keep the existing TypeScript/Node/LM Studio SDK stack. Add a narrow internal execution abstraction and use Windows `wsl.exe` through argument-based child-process calls rather than introducing a broad virtualization dependency.

### Features

Table stakes are explicit Host/WSL selection, distribution discovery, deterministic per-chat workspaces, common path roots across file and shell tools, safe translation, clear failure handling, and legacy Host compatibility.

### Architecture

Build around five boundaries: execution settings/capability detection, path policy, workspace manager, Host/WSL adapters, and workspace-aware tool routing. Preserve skill-library access as a separate trust boundary.

### Pitfalls

The highest risks are shell-string injection, cross-filesystem performance, path escape through normalization or symlinks, stale distribution settings, inconsistent tool working directories, and incomplete process-tree termination.

## Implications for Roadmap

1. Establish tests, settings, path policy, and execution adapters first.
2. Add deterministic workspace lifecycle and route every project-scoped tool through one context.
3. Finish with migration, security hardening, documentation, and end-to-end verification.

Coarse granularity supports three phases, each delivering an observable vertical increment.

## Sources

- Microsoft WSL basic commands and distribution selection documentation.
- Microsoft guidance for working across Windows and Linux filesystems and WSL development environments.
- Microsoft WSL version/performance guidance.
- Node.js child-process documentation.
- Existing `.planning/codebase/` map and `todo.md`.
