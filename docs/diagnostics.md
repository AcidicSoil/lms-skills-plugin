# Diagnostics reference

This reference explains plugin logs, request ids, and trace recipes for troubleshooting skill routing and tool calls.


The plugin emits concise structured logs prefixed with `[lms-skills]` to both console output and a persistent diagnostics file:

```text
~/.lmstudio/plugin-data/lms-skills/diagnostics.log
```

When the log exceeds `LMS_SKILLS_DIAGNOSTICS_MAX_BYTES` (default `5000000`), it is rotated to:

```text
~/.lmstudio/plugin-data/lms-skills/diagnostics.log.1
```

In LM Studio, the same console lines are also visible in the plugin/developer log stream. Tool calls also emit visible LM Studio tool status updates while they run, including start/completion, request ids, runtime-target/root resolution, slow/recovery warnings, and errors. Use the `id=...` request id to correlate preprocessing, routing, visible tool status, tool results, slow/recovery events, and backend fallback for one user turn.

Default logs are human-readable route, context-injection, enhanced-search, and tool summaries. Every prompt injection logs proof of what was inserted, including injection kind, selected/expanded skills, source paths, byte counts, short SHA-256 hashes, and compact previews:

```text
[lms-skills] prompt activation tokens=$example-skill resolved=example-skill unresolved=- expanded=1 action=expanded_before_model id=prompt-...
[lms-skills] route mode=explicit_activation_expanded action=expanded_skill(example-skill) before_model inject=1984ch id=prompt-...
[lms-skills] context kind=explicit_expanded packet=skill_invocation_packet skills=example-skill inject=1984ch sha=85a3f72de1cd preview="<skill_invocation_packet ..." payload=67ch payloadSha=678f53749760 payload="..." id=prompt-...
[lms-skills] context kind=routed packet=routed_skills skills=1:docs-writer:score=128:confidence=high:source=WSL:/... inject=1378ch sha=d0abcc393a31 payload="please update the README docs" id=prompt-...
[lms-skills] enhanced_search requested=auto active=ck available={"qmd":false,"ck":true} fallback=false reason=- raw=8 resolved=3 diagnostics="ck returned 8 path candidate(s), resolved 3 skill(s)" id=list_skills-...
[lms-skills] read_skill_file start skill=example-skill file=- timeout=30000ms id=read_skill_file-...
[lms-skills] read_skill_file done 42ms id=read_skill_file-...
```

The `context` line is the audit trail for model-facing context. Use it to verify whether the model received an explicit expanded skill packet, routed skill candidates, a compact reminder, or fallback context.

Set `LMS_SKILLS_DEBUG=1` to switch back to full JSON event logs.

Enable verbose step/runtime tracing with:

```bash
LMS_SKILLS_DEBUG=1 npm run dev
```

Optional thresholds:

```bash
LMS_SKILLS_SLOW_STEP_MS=250
LMS_SKILLS_SLOW_RUNTIME_MS=500
LMS_SKILLS_DIAGNOSTICS_MAX_BYTES=5000000
```

Trace recipes:

- Explicit `$skill` activation should show `prompt activation`, `route mode=explicit_activation_expanded`, and `context kind=explicit_expanded`. If the model later calls `list_skills` for the same skill, compare the injected context line to confirm whether the preprocessor expanded it.
- Normal routed prompts should show `route mode=routed`, selected/rejected skill scores, then a `read_skill_file start` for the chosen skill if the model follows the workflow.
- Skill discovery should show `list_skills start`, optional `enhanced_search`, and then `list_skills result` or `list_skills route`.
- Slow or stuck discovery should show `tool_slow`; if `list_skills` still does not return, it should show `tool_recovery_timeout` and return a structured recovery result to the model.
- Command attempts should show `run_command safety` before any runtime execution.
