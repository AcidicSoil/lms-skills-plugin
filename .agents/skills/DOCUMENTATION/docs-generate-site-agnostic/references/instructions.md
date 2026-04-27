# Documentation Site Generation Instructions

Detailed instructions for generating Level 3 documentation site content in a portable, agent-agnostic way.

## Implementation Steps

### Step 1: Determine Framework

Choose the framework from explicit input or repository configuration:

- `rspress` - RSPress 2.x
- `docusaurus` - Docusaurus 2.x
- `vitepress` - VitePress

Load only the features that are supported by the selected framework.

### Step 2: Resolve Repository Paths

Locate the required inputs in this order:

1. Explicit inputs such as `design_config_path`, `design_docs_path`, and `output_path`
2. Repository-local configuration files
3. Conventional docs locations such as `docs/`, `design/`, `packages/*/docs/`, or package-local design-doc folders

Do not hard-code `.claude/` paths or any vendor-specific workspace conventions.

### Step 3: Read Design Documentation

Extract source material for:

- Landing page value proposition
- Getting-started installation and first example
- Concept documentation for architecture and design decisions
- How-to guides for common tasks
- Examples and API-reference links

Prefer repository truth over assumptions.

### Step 4: Create Landing Page

**File:** `index.mdx` or `index.md`

**RSPress example:**

```mdx
---
pageType: home
hero:
  name: {Module Name}
  text: {One-line description}
  tagline: {Tagline from design docs}
  actions:
    - theme: brand
      text: Get Started
      link: /guides/getting-started
    - theme: alt
      text: View Source
      link: {Repository URL}
features:
  - title: {Feature 1}
    details: {Description}
  - title: {Feature 2}
    details: {Description}
  - title: {Feature 3}
    details: {Description}
---
```

Extract content from design docs:

- Hero name from product or package name
- Tagline from overview or goals
- Features from primary capabilities
- Actions to getting started and repository source when available

### Step 5: Generate Getting Started

**File:** `guides/getting-started.mdx`

Recommended structure:

1. Installation
2. First working example
3. Understanding the basics
4. Common patterns
5. Next steps

Use only framework-supported interactive components.

````mdx
:::tip
Give new users one practical tip before the first example.
:::

:::tabs
== npm
```bash
npm install package-name
```

== pnpm
```bash
pnpm add package-name
```
:::
````

### Step 6: Generate Concept Documentation

Transform internal architecture into user-facing explanations.

**Source design doc section:**

> ## Architecture
>
> The system uses three collaborating layers for fetching, caching, and coordination.

**Concept doc output (`concepts/architecture.mdx`):**

```mdx
---
title: Architecture Overview
description: Understand how the package is organized
---

# Architecture Overview

The package is organized into three main components that work together.

## Components

### Package Fetcher

Downloads package data from the source registry.

### Cache Manager

Stores data locally for faster repeated access.

### Registry Coordinator

Connects fetching and caching into one workflow.

:::note
You do not need to configure these components individually for basic usage.
:::
```

### Step 7: Generate How-To Guides

Create task-oriented guides with complete examples.

**Example: `guides/caching.mdx`**

````mdx
---
title: How to Use Caching
description: Configure and use the caching system
---

# How to Use Caching

Learn how to configure caching for your use case.

## Configure Cache Location

```typescript
const registry = createRegistry({
  cacheDir: '~/.my-app/cache'
});
```

## Set Cache Duration

```typescript
const registry = createRegistry({
  cacheTTL: 3600
});
```

:::warning
A very low TTL causes frequent re-fetching. A very high TTL can preserve stale data.
:::

## Clear Cache

```typescript
await registry.clearCache();
```
````

### Step 8: Create Navigation

Generate navigation metadata appropriate to the selected framework.

**RSPress `_meta.json`:**

```json
[
  {
    "text": "Guide",
    "items": [
      {
        "text": "Getting Started",
        "link": "/guides/getting-started"
      },
      {
        "text": "Caching",
        "link": "/guides/caching"
      }
    ]
  },
  {
    "text": "Concepts",
    "items": [
      {
        "text": "Architecture",
        "link": "/concepts/architecture"
      }
    ]
  }
]
```

### Step 9: Integrate API Documentation

When `api_docs` is available:

- Add an API Reference entry to navigation
- Link guides to relevant API pages
- Keep reference links stable and descriptive

```mdx
See the [`createRegistry` API reference](/api/functions/createRegistry) for all options.
```

## Framework Features

### RSPress

- Tabs
- Callouts
- Code groups
- Mermaid diagrams

### Docusaurus

- Admonitions
- Tabs
- MDX components
- Syntax-highlighted code blocks

### VitePress

- Custom containers
- Code groups
- Markdown-first pages with selective framework enhancements

## Content Transformation Rules

### Architecture to User Concept

Turn internal implementation details into mental models users can act on.

**Internal description:**

> The package uses separate fetch, cache, and registry layers.

**User-facing description:**

```mdx
# Architecture

The package has three main parts:

1. **Fetch Layer** - Retrieves package data
2. **Cache Layer** - Stores data locally
3. **Registry Layer** - Coordinates everything

These parts work together automatically for normal usage.
```

### Implementation Pattern to User Guide

Turn low-level pipeline descriptions into practical tasks.

**Internal description:**

> The system fetches packages, transforms them, and emits a virtual file system.

**User guide:**

````mdx
# Generate a Virtual File System

Create a VFS for TypeScript tooling:

```typescript
const vfs = await registry.generateVFS(['zod@3.22.0']);
```

The VFS includes all required type definitions and can be used with TypeScript tooling.
````

## Quality Standards

Level 3 site docs should be:

- Engaging
- Progressive
- Interactive when useful
- Visual when diagrams help
- Mobile-friendly
- SEO-aware
- Accessible
