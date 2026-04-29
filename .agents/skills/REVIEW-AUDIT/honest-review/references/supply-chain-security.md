# Supply Chain Security

2025-2026 supply chain security practices for dependency auditing.
Apply when code has external dependencies, lockfiles, or CI/CD pipelines.
Expands the slopsquatting and dependency checks from the core checklists.

## Contents

- [Slopsquatting and Typosquatting](#slopsquatting-and-typosquatting)
- [Lockfile Integrity](#lockfile-integrity)
- [Phantom Dependencies](#phantom-dependencies)
- [SBOM Validation](#sbom-validation)
- [Attestation Verification](#attestation-verification)
- [Binary and Pre-built Artifacts](#binary-and-pre-built-artifacts)
- [Dependency Confusion](#dependency-confusion)

## Slopsquatting and Typosquatting

AI-hallucinated or misspelled package names in dependencies — security-critical.

**Detection:**

1. Extract all package names from imports AND dependency manifests.
2. For each unfamiliar package, WebFetch the registry endpoint:
   - npm: `registry.npmjs.org/{pkg}`
   - PyPI: `pypi.org/pypi/{pkg}/json`
   - crates.io: `crates.io/api/v1/crates/{pkg}`
   - Go: `pkg.go.dev/{module}`
3. If 404: flag as **slopsquatting** (potential supply chain attack vector).
4. If exists but suspicious: check download counts, creation date, maintainer count.

**Suspicious indicators:**

- Package created within last 30 days with < 100 downloads
- Package name is 1 edit distance from a popular package
- Package has no README, no tests, no CI
- Single maintainer with no other packages

**Priority:** Always P0 for non-existent packages. P1 for suspicious packages.

## Lockfile Integrity

Verify dependency resolution is deterministic and tamper-resistant.

**Checks:**

- Lockfile exists and is committed: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `uv.lock`, `Cargo.lock`, `go.sum`, `Gemfile.lock`, `poetry.lock`
- Lockfile is not in `.gitignore` (except `Cargo.lock` for libraries per Rust convention)
- Lockfile matches manifest: run `npm ci --dry-run` or equivalent to detect drift
- Integrity hashes present: npm uses `integrity` field (sha512), pip uses `--hash` mode

**Flag:**

- Missing lockfile in production project → P1
- Lockfile in `.gitignore` → P1
- Lockfile/manifest drift → P2

## Phantom Dependencies

Packages imported in code but not declared in the dependency manifest.

**Detection:**

1. Extract all import statements from source files.
2. Map imports to package names (strip submodules: `from foo.bar import baz` → `foo`).
3. Compare against declared dependencies in manifest.
4. Flag imports with no corresponding dependency declaration.

**Exceptions:**

- Standard library modules (use language-specific stdlib list)
- Local/relative imports
- Optional/conditional imports guarded by try/except

**Priority:** P2 (fragile — works only because a transitive dependency provides it).

## SBOM Validation

Software Bill of Materials (CycloneDX or SPDX format) for dependency transparency.

**Checks:**

- SBOM file exists (if project claims compliance): `sbom.json`, `bom.xml`, `*.spdx.json`
- SBOM covers all direct dependencies
- SBOM includes license information for each component
- SBOM version matches current dependency versions

**Generate if missing (recommendation, not finding):**

```bash
# CycloneDX for npm
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# CycloneDX for Python
cyclonedx-py environment --output sbom.json

# SPDX for Go
spdx-sbom-generator -o sbom.spdx.json
```

## Attestation Verification

Verify provenance of downloaded packages using Sigstore/cosign.

**Checks:**

- npm packages: `npm audit signatures` verifies registry attestations
- Python packages: check for PEP 740 attestations on PyPI
- Container images: `cosign verify` against Sigstore transparency log

**Flag:**

- Packages with failed attestation verification → P1
- Projects using containers without image signing → P2 (recommendation)

## Binary and Pre-built Artifacts

Pre-compiled binaries, vendored libraries, or downloaded executables.

**Checks:**

- Binary files committed to repo: flag and ask for justification
- Downloaded executables in CI/CD: verify checksum against known-good hash
- Vendored dependencies: check for known CVEs in vendored versions
- WebAssembly or native modules: verify source availability and reproducible build

**Priority:** P1 for unverified binaries in CI/CD. P2 for vendored deps.

## Dependency Confusion

Mixed public/private package sources can lead to substitution attacks.

**Checks:**

- Private registry configured: `.npmrc`, `pip.conf`, `config.toml` (cargo)
- Scoped packages: private packages use org scope (`@org/pkg`) to prevent public substitution
- Priority ordering: private registry checked before public (verify resolver config)
- Package name reservation: critical private package names reserved on public registries

**Flag:**

- Unscoped private packages without registry pinning → P1
- Mixed public/private sources without explicit ordering → P2

## Build Pipeline Integrity

Aligned with OWASP A03:2025 (Software Supply Chain Failures). Review CI/CD pipeline
configuration for injection vectors and supply chain compromise risks.

### Script Injection via Untrusted Input

GitHub Actions workflows are vulnerable to script injection when using expressions
like `${{ github.event.pull_request.title }}` directly in `run:` steps. Attackers
craft PR titles or branch names containing shell commands.

**Check for:**
- `${{ github.event.* }}` used directly in `run:` blocks (use environment variables instead)
- `${{ github.head_ref }}` in `run:` blocks (branch names are attacker-controlled)
- Workflows triggered by `pull_request_target` with `actions/checkout` of the PR head

### Pinned Dependencies in CI

**Check for:**
- GitHub Actions using `@main` or `@v1` tags instead of pinned SHA refs
  - Bad: `uses: actions/checkout@v4`
  - Good: `uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`
- Docker images using `:latest` instead of digest-pinned versions
- Package managers installing without lockfiles in CI (e.g., `pip install` without `--require-hashes`)

### Artifact Provenance

**Check for:**
- Published artifacts without SLSA provenance attestation
- Missing or incomplete SBOM (Software Bill of Materials) for releases
- Build environments that are not isolated (shared runners with no sandboxing)
- Secrets exposed in build logs (check for `set -x` or debug flags in CI scripts)

See references/ci-integration.md for CI pipeline integration patterns.

Cross-references: references/checklists.md (AI Code Smells, Security), references/research-playbook.md (Slopsquatting Detector, Dependency Health Checker).
