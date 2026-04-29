# Quality Gate

Before returning catalog assets, verify:

| Check | Requirement |
|---|---|
| Asset type | Clearly snippet, workflow, pack, index, or export package |
| IDs | Unique, stable, namespaced, versioned when useful |
| Titles | Short and searchable |
| Descriptions | Explain what the asset does and when to use it |
| Variables | Specific names, required/default status clear |
| Defaults | Safe, short, and not secret-bearing |
| Tags | Controlled facet tags, no synonyms or casing drift |
| Workflow steps | Ordered, purposeful, correct `insertMode` |
| Searchability | Important terms appear in title, description, tags, or template |
| Compatibility | Schema assumptions and migration caveats stated |
| Hashes | Real hashes not invented; placeholders marked clearly |
| LLM intent | Prompt meaning preserved; executable commands separated |

## Common Fixes

- Rename broad prefixes to `<domain>.<intent>`.
- Split multi-phase snippets into workflows.
- Replace generic placeholders with domain-specific names.
- Move bulky examples into separate reference output instead of bloating templates.
- Mark draft assets with `status:draft` until tested.
