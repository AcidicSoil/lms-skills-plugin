# OpenGSD Docs Lookup

Use this skill when a GSD task needs reference details from OpenGSD documentation or source docs.

## Concern boundary

This skill is only for docs lookup and QMD retrieval. It does not perform browser automation and it does not define browser verification evidence rules.

## Preferred lookup order

1. Query local QMD collections when available:
   - `opengsd-docs` for public OpenGSD docs;
   - `gsd-core` for Core source/reference details;
   - `gsd-browser` for Browser CLI/MCP, snapshots, refs, live viewer, recording, and evidence details.
2. Use the local HTML docs site as a human-readable fallback when available.
3. If docs are missing, report that the docs corpus needs refresh through the project-provided shell alias/function or `.serena-gsd/scripts/opengsd-docs/sync-opengsd-agent-docs.sh`.

Do not run network docs setup during a GSD workflow unless the user or the active plan explicitly asks for that setup step.

## Useful queries

```bash
qmd query "how should agents use GSD Browser snapshots refs and CLI tools?"
qmd query "how should browser evidence be captured for GSD verification?"
qmd query "how does GSD Core use planning artifacts and phases?"
qmd query "how do GSD Core and GSD Browser work together?"
```

## Docs sync expectation

The distributable docs sync script mirrors the local `opengsd-docs.bash` behavior for repo refresh and QMD indexing. It hard-resets local OpenGSD repos, prunes non-English GSD Core docs before indexing, resets QMD collections, then runs `qmd update` when QMD is installed.
