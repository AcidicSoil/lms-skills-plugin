# Remediation Templates

Fix patterns organized by debt type with effort estimates and risk ratings.

## Contents

1. [Design Debt Fixes](#design-debt-fixes)
2. [Test Debt Fixes](#test-debt-fixes)
3. [Documentation Debt Fixes](#documentation-debt-fixes)
4. [Dependency Debt Fixes](#dependency-debt-fixes)
5. [Infrastructure Debt Fixes](#infrastructure-debt-fixes)

---

## Design Debt Fixes

### High Complexity (CC > 10)

**Pattern:** Extract method + guard clauses
**Effort:** Medium (2-4 hours per function)
**Risk:** Low (behavior-preserving refactoring)

Steps:
1. Ensure test coverage exists for the function
2. Identify independent decision branches
3. Extract each branch to a named helper function
4. Replace nested conditions with early returns (guard clauses)
5. Verify tests still pass

### Dead Code

**Pattern:** Delete with verification
**Effort:** Low (15-30 minutes per item)
**Risk:** Low-Medium (may be used dynamically)

Steps:
1. Grep for all references to the symbol
2. Check for dynamic access (getattr, string-based imports)
3. Check for framework/convention usage (decorators, magic methods)
4. Delete if confidence >= 0.8
5. Run tests to verify

### Code Duplication

**Pattern:** Extract to shared utility
**Effort:** Medium (1-2 hours per group)
**Risk:** Medium (changes multiple files)

Steps:
1. Identify the canonical version (most complete, best tested)
2. Extract to a shared module
3. Replace all copies with imports
4. Verify behavior with existing tests

### God Class/Function

**Pattern:** Single responsibility decomposition
**Effort:** High (4-8 hours)
**Risk:** Medium-High (structural change)

Steps:
1. Identify distinct responsibilities
2. Extract each responsibility to its own class/function
3. Use composition to combine
4. Update all callers
5. Add tests for new interfaces

---

## Test Debt Fixes

### Missing Test Coverage

**Pattern:** Risk-based test addition
**Effort:** Medium (1-2 hours per module)
**Risk:** None (additive)

Steps:
1. Identify untested public functions
2. Prioritize by: mutation risk > read-only, public > private
3. Write happy-path tests first
4. Add boundary/error tests for high-risk functions
5. Set coverage gate in CI

### Brittle Tests

**Pattern:** Decouple from implementation
**Effort:** Medium (30-60 minutes per test)
**Risk:** Low

Steps:
1. Identify tests that break on non-behavioral changes
2. Replace implementation assertions with behavior assertions
3. Use test doubles at boundaries, not internal calls
4. Verify tests still catch real bugs

---

## Documentation Debt Fixes

### Undocumented Public API

**Pattern:** Docstring generation pass
**Effort:** Low (5-10 minutes per function)
**Risk:** None (additive)

Steps:
1. List all public functions/classes without docstrings
2. Write one-line summary for each
3. Add parameter docs for functions with 3+ params
4. Add return type documentation

### Stale Documentation

**Pattern:** Audit and update
**Effort:** Low-Medium (1-2 hours)
**Risk:** None

Steps:
1. Grep README for file/function references
2. Verify each reference still exists
3. Update or remove stale references
4. Check examples still work

---

## Dependency Debt Fixes

### Deprecated Packages

**Pattern:** Direct replacement
**Effort:** Variable (1 hour - 1 week)
**Risk:** High (behavioral changes possible)

Steps:
1. Find recommended replacement (check deprecation notice)
2. Read migration guide if available
3. Update dependency and all import sites
4. Run full test suite
5. Test edge cases manually

### Outdated Dependencies

**Pattern:** Incremental upgrade
**Effort:** Low-Medium per package
**Risk:** Medium

Steps:
1. Read CHANGELOG for breaking changes between versions
2. Upgrade one major version at a time
3. Fix breaking changes at each step
4. Run tests after each upgrade
5. Deploy and monitor

---

## Infrastructure Debt Fixes

### Missing CI/CD

**Pattern:** Progressive pipeline setup
**Effort:** Medium-High (2-4 hours)
**Risk:** None (additive)

Steps:
1. Start with lint + test pipeline
2. Add type checking
3. Add coverage reporting
4. Add deployment automation
5. Add security scanning

### Inconsistent Tooling

**Pattern:** Standardization
**Effort:** Medium (2-4 hours)
**Risk:** Low-Medium

Steps:
1. Survey current tool usage across team/project
2. Choose canonical tool per category
3. Migrate all configurations
4. Document in CONTRIBUTING.md
5. Add CI enforcement
