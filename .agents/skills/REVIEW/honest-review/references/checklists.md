# Analysis Checklists

Full checklists for all review levels. SKILL.md has abbreviated versions.
Read during analysis (Step 3) or when building teammate prompts.

## Contents

- [Correctness Level](#correctness-level-lines-expressions-robustness)
- [Design Level](#design-level-modules-interfaces-flexibility)
- [Efficiency Level](#efficiency-level-algorithms-data-structures-performance)
- [Security](#context-dependent-security)
- [Observability](#context-dependent-observability)
- [AI Code Smells](#context-dependent-ai-code-smells)
- [Configuration and Secrets](#context-dependent-configuration-and-secrets)
- [Resilience](#context-dependent-resilience)
- [i18n and Accessibility](#context-dependent-i18n-and-accessibility)
- [Data Migration](#context-dependent-data-migration)
- [Backward Compatibility](#context-dependent-backward-compatibility)
- [Infrastructure as Code](#context-dependent-infrastructure-as-code)
- [Requirements Validation](#context-dependent-requirements-validation)

## Correctness Level (Lines, Expressions, Robustness)

### Defects

- Check correctness: return values, off-by-one, boundary conditions, null/undefined handling
- Check error handling: missing catches, swallowed errors, generic catch-all, missing finally/cleanup
- Check security: unsanitized input, injection vectors, hardcoded secrets, insecure defaults
- Check readability: misleading names, magic numbers, unclear control flow
- Check consistency: naming style, error patterns, logging patterns match rest of codebase
- Check resource leaks: unclosed connections, file handles, streams, timers
- Check concurrency: race conditions, missing locks, deadlock potential
- **TOCTOU anti-pattern**: existence check (`os.path.exists`, `fs.existsSync`, try-stat) before an operation — operate directly, handle the error; existence checks introduce race conditions

### Simplification

- Remove dead code, unused imports, unreachable branches
- Remove defensive checks for impossible states (trust internal callers)
- Remove dead error paths — catch blocks that log and re-raise identically, error handling for conditions that cannot occur in context
- Remove comments that restate the code — keep only "why" comments
- Flatten complex conditionals into early returns or guard clauses
- Replace manual iteration with built-in/stdlib equivalents
- Replace hand-rolled logic with well-known library functions
- Flatten nested callbacks into async/await or promise chains

## Design Level (Modules, Interfaces, Flexibility)

### Defects

- Check test coverage: untested public API, missing edge cases, brittle mocks
- Check mutation resilience: would mutating key logic (flipping conditionals, changing boundaries) cause test failures? Flag tests that pass regardless of mutations.
- Check property-based testing opportunities: invariants, round-trip properties, commutativity. Flag hand-written examples where PBT would catch more.
- Check test naming: does each test name describe the scenario and expected outcome? Flag generic names ("test1", "testHelper").
- Check test isolation: shared mutable state between tests, order-dependent tests, time-dependent assertions
- Check boundary testing: off-by-one, empty collections, max values, unicode, null/undefined at boundaries
- Check coupling: module A depends on B's internals, circular dependencies
- Check interface contracts: unclear ownership, missing validation at boundaries
- Check cognitive complexity: functions exceeding cyclomatic complexity of 15
- Check generalizability: components tightly coupled to a single use case where a more general design costs nothing extra
- Check flexibility gaps: rigid interfaces that force callers into workarounds or copy-paste
- **Stringly-typed**: raw string literals where a constant, enum, or branded type already exists (Grep to confirm)
- **Parameter sprawl**: new parameters added to a function instead of restructuring its callers
- **Redundant state**: field that duplicates existing state; cached value that could be derived; observer that could be a direct call
- **Copy-paste variation**: 2+ near-identical blocks differing only in 1-2 values — extract shared abstraction (note: "copy-paste artifacts" in AI Code Smells covers LLM-generated duplicates; this covers hand-written structural repetition)
- **Leaky abstraction**: caller reaching past abstraction boundary; new cross-layer call breaking encapsulation

### Simplification

- Remove wrappers that just delegate to a single implementation (1:1 pass-through)
- Remove abstractions with only one concrete use — inline them
- Remove config/feature flags for things that never vary in practice
- Remove extension points nobody extends — add when needed, not before
- Collapse unnecessary layers of indirection (A calls B calls C, B does nothing)
- Unify near-identical modules that differ only in minor details
- Merge over-decomposed files that should be one module
- Eliminate pass-through plumbing where data passes unchanged across layers
- Extract duplicate logic across branches into shared path
- Remove stale imports that no longer serve any purpose

## Efficiency Level (Algorithms, Data Structures, Performance)

### Defects

- Check complexity class: O(n^2) or worse where better algorithms exist
- Check N+1 patterns: queries/calls in loops, missing batching
- Check backpressure: unbounded queues, missing rate limiting, memory growth
- Check wrong data structure: using a data structure mismatched for the access pattern (map vs. list, set vs. array)
- **Hot-path bloat**: blocking/synchronous work added to process startup, per-request middleware, or per-render functions
- **Missed concurrency**: 2+ independent I/O or compute calls in sequence that could be parallelized (`Promise.all`, `asyncio.gather`)
- **Overly broad operation**: reads entire file/table/collection to use only a portion — add offset/limit/projection
- **Unbounded data structure**: map/list/set that grows without eviction, TTL, or size cap (distinct from unbounded queues covered under backpressure — targets general-purpose in-memory stores)
- **Event listener leak**: `.on()` / `addEventListener` without corresponding remove in cleanup

### Simplification

- Replace O(n^2) with O(n) or O(n log n) where possible
- Remove unnecessary serialization/deserialization round-trips
- Consolidate multi-pass operations into single pass where data allows
- Replace reimplemented logic with stdlib or existing dependency equivalents
- Add or remove caching/memoization based on actual access patterns
- Switch between polling and push based on actual requirements
- Simplify complex state machines where a simpler model handles all cases
- Reduce distributed complexity where a simpler topology suffices

## Context-Dependent: Security

Updated for OWASP Top 10 2025 — includes A03:2025 (Supply Chain) and A10:2025 (Exception Handling).

Apply when code touches auth, payments, user data, network I/O, or file operations.

- Check broken access control: missing authorization checks, privilege escalation paths
- Check security misconfiguration: debug mode in prod, permissive CORS, default credentials
- Check injection vectors: SQL injection, command injection, XSS, template injection
- Check cryptographic failures: weak algorithms, hardcoded keys, insufficient entropy
- Check supply chain: see references/supply-chain-security.md for full supply chain audit
- Check auth boundaries: session management, token validation, CSRF protection
- Check exception info leakage: stack traces, internal paths, or DB schemas in error responses
- Check SSRF: unvalidated URLs in server-side requests
- **Software supply chain failures (OWASP A03:2025)**: Verify all dependencies exist in registries (slopsquatting detection). Check for unverified/unsigned artifacts, missing SBOM, dependency confusion between public/private scopes. See references/supply-chain-security.md for the full supply chain audit protocol.
- **Mishandling of exceptional conditions (OWASP A10:2025)**: Check error paths that leak information (stack traces, internal paths, database errors in responses). Flag catch-all blocks that swallow critical errors without propagation. Verify async error chains propagate correctly (unhandled promise rejections, uncaught exceptions in goroutines). Check resource cleanup in error paths (file handles, database connections, locks).

IMPORTANT: Research-validate security findings against current OWASP guidance
and library-specific security docs via WebSearch and Context7.

## Context-Dependent: Observability

Apply when code is a service, API, or long-running process.

- Check structured logging: log levels appropriate, context included, PII excluded
- Check metrics: RED metrics (rate, errors, duration) instrumented for key paths
- Check distributed tracing: trace/span IDs propagated across service boundaries
- Check silent failures: background jobs, event handlers, async operations that fail quietly
- Check health check completeness: covers dependencies, not just process liveness

## Context-Dependent: AI Code Smells

Apply when code appears LLM-generated or when unfamiliar dependencies are used.

- Check slopsquatting: verify every import and dependency name exists in the relevant package registry (npm, PyPI, crates.io). Flag names that look plausible but do not exist — these may be hallucinated by an LLM.
- Check over-engineering: look for abstraction layers, design patterns, or configuration systems disproportionate to the problem size. Flag "enterprise patterns" in simple scripts.
- Check sycophantic comments: remove comments that praise the code ("elegant solution", "clever approach") or explain obvious operations ("increment counter by 1"). Keep only comments that explain non-obvious "why."
- Check phantom error handling: catch blocks that log and re-raise identically, error handling for conditions that cannot occur in context, defensive checks against the function's own contract.
- Check hallucinated APIs: verify that method names, function signatures, and parameter names match actual library documentation. Flag APIs that look correct but do not exist.
- Check copy-paste artifacts: duplicated code blocks with minor variations, inconsistent naming suggesting multiple generation passes, TODO comments referencing non-existent features.
- Check model-specific patterns: code with verbose variable names (`user_authentication_result_status`), excessive type annotations on trivial functions, unnecessary docstrings on obvious methods, overly defensive validation. These suggest code generated by an LLM and not reviewed by a human.
- Check test-implementation mismatch: tests that were generated alongside the implementation and only cover the happy path. Flag: tests that mirror the implementation logic exactly, tests with zero edge cases, tests that would pass even if the function returned a constant.

IMPORTANT: Research-validate slopsquatting and hallucinated APIs with highest priority —
these are security-critical. Use WebFetch against package registries and Context7 for API verification.

## Context-Dependent: Configuration and Secrets

Apply when code handles environment config, credentials, or deployment settings.

- Check 12-factor compliance: configuration via environment variables, not hardcoded values. Flag config embedded in code.
- Check secrets in source: scan for API keys, tokens, passwords, connection strings in code or committed config files. Check .gitignore covers sensitive files.
- Check config coupling: configuration that requires coordinated changes across multiple files or services. Flag hidden dependencies between config values.
- Check default security: default config values must be secure (no debug mode, no open CORS, no default passwords). Flag insecure defaults.
- Check environment parity: configuration that silently differs between dev/staging/production. Flag environment-specific code paths without explicit guards.

## Context-Dependent: Resilience

Apply when code calls external services, databases, or shared resources.

- Check timeouts: every external call must have an explicit timeout. Flag calls with implicit or no timeout.
- Check circuit breaking: repeated failures to an external dependency must trigger a circuit breaker or fallback. Flag unbounded retry loops.
- Check fallback behavior: what happens when a dependency is unavailable? Flag code that crashes instead of degrading gracefully.
- Check retry policy: retries must use exponential backoff with jitter. Flag fixed-interval retries or immediate retries that amplify failures.
- Check single points of failure: identify dependencies where failure means total system failure. Flag missing redundancy for critical paths.
- Check idempotency: operations that may be retried must be idempotent. Flag non-idempotent operations in retry paths.

## Context-Dependent: i18n and Accessibility

Apply when code produces user-facing UI or localized content.

- Check hardcoded strings: user-visible text must use i18n keys, not hardcoded strings. Flag literals in UI components.
- Check locale assumptions: date formats, number formats, currency, sorting order. Flag code that assumes a single locale.
- Check semantic HTML: use semantic elements (nav, main, article, button) instead of generic divs with click handlers. Flag accessibility anti-patterns.
- Check right-to-left support: layout must not break with RTL text. Flag hardcoded directional values (left/right padding, text-align).

## Context-Dependent: Data Migration

Apply when code changes database schemas, data formats, or storage structures.

- Check backward compatibility: new schema must work with old code during rolling deploys. Flag breaking changes without migration paths.
- Check migration ordering: migrations must be idempotent and order-independent where possible. Flag migrations that assume prior state.
- Check data validation: migration must validate data before and after transformation. Flag migrations that silently corrupt invalid records.
- Check zero-downtime: migration must not lock tables or block reads for extended periods. Flag operations that require downtime.

## Context-Dependent: Backward Compatibility

Apply when code changes public APIs, library interfaces, or shared contracts.

- Check breaking changes: identify removed or renamed public methods, changed signatures, altered return types. Flag any change that breaks existing callers.
- Check deprecation path: breaking changes must go through deprecation (warn for 1+ versions, then remove). Flag immediate removals.
- Check semver compliance: breaking changes require a major version bump. Flag breaking changes in minor or patch releases.
- Check changelog: every breaking change must be documented with migration instructions. Flag undocumented breaking changes.

## Context-Dependent: Infrastructure as Code

Apply when code manages cloud resources, containers, CI/CD pipelines, or deployment configuration.

- Check least privilege: IAM roles and service accounts must have minimum required permissions. Flag wildcard permissions (`*`) and overly broad resource scopes.
- Check secrets management: no hardcoded credentials, tokens, or keys in IaC files. Use secret managers (Vault, AWS Secrets Manager, GCP Secret Manager) or environment injection.
- Check resource limits: containers must have CPU/memory limits. Flag unbounded resources that risk noisy-neighbor or OOM issues.
- Check network exposure: security groups and firewall rules must follow least-access. Flag `0.0.0.0/0` ingress on non-public ports.
- Check state management: Terraform state must be remote with locking. Flag local state files or missing backend config.
- Check drift detection: IaC should be the source of truth. Flag manual changes or resources not managed by IaC.
- Check tagging/labeling: all resources must have cost allocation and ownership tags. Flag untagged resources.
- Check idempotency: applying IaC twice must produce the same result. Flag operations that create duplicates on re-apply.

## Context-Dependent: Requirements Validation

Apply when reviewing changes against stated intent (PR description, ticket, session goal).

- Check implementation matches stated intent: does the code do what was requested?
- Check edge cases from requirements are handled: boundary conditions, error states, empty inputs
- Check acceptance criteria are met: if criteria were specified, verify each one
- Check nothing was silently dropped: compare requirements list against implementation, flag omissions
- Check scope creep: flag code that goes beyond what was requested without justification

## Context-Dependent: Async and Concurrency

Apply when code uses async/await, threads, goroutines, actors, or parallel processing.

- Check structured concurrency: tasks should be scoped to a parent lifetime. Flag fire-and-forget tasks that outlive their caller.
- Check cancellation propagation: cancellation tokens or abort signals must propagate through the call chain. Flag async functions that ignore cancellation.
- Check async resource cleanup: resources acquired in async context must be released on both success and cancellation paths. Flag missing finally/defer/cleanup handlers.
- Check backpressure: unbounded channels, queues, or task spawning must have limits. Flag producers that can outpace consumers.
- Check deadlock potential: lock ordering violations, nested locks, and async code holding locks across await points.
- Check thread safety: shared mutable state without synchronization. Flag non-atomic read-modify-write sequences.
- Check error propagation in concurrent contexts: errors in spawned tasks must surface to the caller. Flag silently dropped errors in background tasks.

## Context-Dependent: Memory Safety

Apply when code is in Rust, C, C++, or any language with manual memory management.

- Check use-after-free: references used after the owning value is dropped or freed. In Rust, flag unsafe blocks that bypass borrow checker.
- Check buffer overflows: array/slice access without bounds checking. Flag raw pointer arithmetic without length validation.
- Check uninitialized memory: variables read before being written. Flag `MaybeUninit` or `malloc` without proper initialization.
- Check double-free: resources freed more than once. Flag manual `Drop` implementations that may double-free.
- Check lifetime correctness: in Rust, flag lifetime annotations that could lead to dangling references. In C/C++, flag returning pointers to stack variables.
- Check unsafe FFI boundaries: foreign function calls must validate inputs and handle null pointers. Flag missing null checks at FFI boundaries.

## Convention Violations

Track explicit rule violations from project convention files (AGENTS.md, CLAUDE.md, .cursorrules).

- **Rule break**: code violates an explicit directive in AGENTS.md or CLAUDE.md (cite the rule and line)
- **Severity mapping**:
  - Style-only rule (formatting, naming) → P3/S3
  - Functional rule (toolchain, dependency management, required patterns) → P2/S2
  - Security or integrity rule (auth handling, secret management, input validation) → P1/S1
  - Safety-critical rule (data loss, destructive operations) → P0/S0
- **Evidence**: citation anchor to the violated rule in the convention file + citation anchor to the offending code line
