# Makefile and Justfile Reference

Best practices and patterns for generating Makefiles and justfiles.

## Contents

1. [Makefile Best Practices](#makefile-best-practices)
2. [Justfile Syntax and Patterns](#justfile-syntax-and-patterns)
3. [Migration: Makefile to Justfile](#migration-makefile-to-justfile)

---

## Makefile Best Practices

### Self-documenting help target

```makefile
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

### Variable conventions

```makefile
# Uppercase for user-configurable variables
APP_NAME := myapp
VERSION  := $(shell git describe --tags --always)
BUILD_DIR := build

# Use ?= for overridable defaults
PORT ?= 8080
ENV  ?= development
```

### .PHONY declarations

```makefile
# Declare ALL non-file targets as .PHONY
.PHONY: build test lint clean deploy help

# Or group at the top
.PHONY: all build test lint clean deploy help
```

### Recipe patterns

```makefile
# Multi-line with error handling
build: ## Build the application
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(APP_NAME) ./cmd/...

# Conditional execution
deploy: build ## Deploy to environment
	@if [ "$(ENV)" = "production" ]; then \
		echo "Deploying to production..."; \
		./scripts/deploy-prod.sh; \
	else \
		echo "Deploying to $(ENV)..."; \
		./scripts/deploy.sh "$(ENV)"; \
	fi

# Dependencies
test: lint ## Run tests (lint first)
	go test ./...

# Cleaning
clean: ## Remove build artifacts
	rm -rf $(BUILD_DIR)
	rm -f coverage.out
```

### .ONESHELL for complex recipes

```makefile
.ONESHELL:
setup: ## Set up development environment
	python -m venv .venv
	source .venv/bin/activate
	pip install -r requirements.txt
	echo "Setup complete"
```

### Common Makefile anti-patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| No `.PHONY` | Target skipped if file with same name exists | Always declare `.PHONY` |
| No `help` target | Users cannot discover targets | Add self-documenting help |
| Hardcoded paths | Not portable across machines | Use variables |
| No `clean` target | Build artifacts accumulate | Always provide clean |
| Tabs vs spaces | Make requires tabs for recipes | Ensure tabs (use `.editorconfig`) |
| Missing dependencies | Parallel builds break | Declare all dependencies |

---

## Justfile Syntax and Patterns

### Basic structure

```just
# Project justfile

# Default recipe (runs when just is invoked without arguments)
default: build

# Set shell for recipes
set shell := ["bash", "-euo", "pipefail", "-c"]

# Load .env file
set dotenv-load

# Variables
app_name := "myapp"
version := `git describe --tags --always`
```

### Recipe patterns

```just
# Simple recipe with documentation
build: ## Build the application
    cargo build --release

# Recipe with parameters
deploy env="staging": build
    ./scripts/deploy.sh {{env}}

# Recipe with default and variadic params
test *args="": lint
    cargo test {{args}}

# Conditional recipe
check:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -f Cargo.toml ]; then
        cargo check
    elif [ -f package.json ]; then
        npm run check
    fi

# Recipe listing dependencies
ci: lint test build
    echo "CI pipeline complete"
```

### Parameter types

```just
# Positional parameter
greet name:
    echo "Hello, {{name}}"

# With default value
serve port="8080":
    python -m http.server {{port}}

# Variadic (collects remaining args)
run *args:
    cargo run -- {{args}}

# Environment variable parameter
build $RUST_LOG="info":
    cargo build
```

### Recipe attributes

```just
# Run in specific directory
[working-directory: 'frontend']
build-ui:
    npm run build

# Suppress command echo
[no-cd]
status:
    @git status

# Platform-specific
[linux]
install:
    sudo apt install dependencies

[macos]
install:
    brew install dependencies

# Private (not shown in --list)
[private]
_helper:
    echo "internal"
```

### Common justfile patterns

```just
# Self-documenting list (built-in)
# just --list  (no need for custom help target)

# Group recipes with comments
# === Development ===

dev: ## Start development server
    cargo watch -x run

# === Testing ===

test: ## Run test suite
    cargo test

# === Release ===

release version: test
    git tag "v{{version}}"
    git push --tags
```

---

## Migration: Makefile to Justfile

| Makefile | Justfile | Notes |
|----------|----------|-------|
| `.PHONY: target` | Not needed | All recipes are "phony" by default |
| `.DEFAULT_GOAL := target` | First recipe or `default:` | First recipe runs by default |
| `$(VAR)` | `{{var}}` | Double curly braces for variables |
| `$$var` (shell var) | `$var` | Single `$` in justfile |
| `$(shell cmd)` | `` `cmd` `` | Backtick evaluation |
| `@recipe` (silence) | `@recipe` | Same syntax |
| Tab indentation | Any consistent indentation | Spaces work in justfile |
| `include file.mk` | `import 'file.just'` | Import syntax |
| `?=` (override) | `var := env_var_or_default('VAR', 'default')` | Environment variable check |
