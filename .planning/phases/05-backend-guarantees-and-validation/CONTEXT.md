# Phase 5 Context — Backend Guarantees and Validation

## Goal

Ensure commands, filesystem access, repository discovery, and skill workflows all use one coherent Host or WSL backend with strict preflight validation.

## Decisions

- WSL paths must never reach Host filesystem APIs.
- Structured program/argument execution and raw shell-string execution are separate contracts.
- Host shell settings do not alter WSL raw-command behavior.
- Validation failures return structured recovery guidance before invocation begins.

## Requirements

BACK-01 through BACK-08; TEST-01 through TEST-04, TEST-06, TEST-08.
