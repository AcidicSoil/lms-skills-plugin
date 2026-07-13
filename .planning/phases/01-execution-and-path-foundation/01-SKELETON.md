# Phase 1 Walking Skeleton

The phase's thinnest end-to-end path is:

1. A legacy configuration resolves to `executionEnvironment: "host"`.
2. A Windows configuration selecting WSL receives a typed capability result.
3. An explicit cwd is classified and validated for the selected environment.
4. `run_command` dispatches to Host or WSL without silent fallback.
5. Spawn program/argv and structured result are proven through injected-process tests.

The skeleton intentionally excludes project profile persistence and filesystem-tool routing, which begin in Phase 2.
