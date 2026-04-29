# Quality Gate

Run these checks before returning migrated assets.

## Asset Checks

- Prefixes and IDs are unique.
- Names are compact, lowercase where required, and namespaced.
- Templates preserve original LLM-facing meaning.
- Required variables have no fake defaults.
- Optional variables define fallback behavior.
- Tags use controlled lowercase facets.
- Workflow steps use `insertMode`, not ambiguous `mode`.
- `replace` is used only when destructive replacement is intended.

## Search and Catalog Checks

- Titles describe the action, not the tool.
- Descriptions explain what the asset does and when to use it.
- Tags include asset type, domain, mode, surface, status, and risk where useful.
- Deprecated or archived items are not mixed into active packs without a migration note.

## Safety Checks

- No secrets or personal identifiers are introduced.
- No unsafe operational instructions are added.
- Shell commands are separated from prompt templates.
- Path-like text and globs remain prompt-language unless explicitly executable.
