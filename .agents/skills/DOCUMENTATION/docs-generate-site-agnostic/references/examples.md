# Documentation Site Generation Examples

Examples of Level 3 documentation site content generated from design docs without assuming any particular agent host.

## Example: `effect-type-registry`

### Generated Structure

```text
website/docs/en/packages/effect-type-registry/
├── index.mdx
├── _meta.json
├── guides/
│   ├── getting-started.mdx
│   ├── caching.mdx
│   └── performance.mdx
├── concepts/
│   └── architecture.mdx
└── examples/
    ├── basic-usage.mdx
    └── advanced.mdx
```

### Landing Page Features

The generated landing page can include:

- Hero section with package name and tagline
- Feature cards for key capabilities
- Quick code example preview
- Calls to action such as Get Started and View Source
- Links to guides and concepts

### Getting Started Guide

The getting-started guide typically includes:

- Installation with package-manager variants
- First working example
- Explanation of core concepts
- Common patterns
- Clear next steps

Use interactive components only when the selected framework supports them.

### Concept Documentation

Concept docs transform design architecture into user-facing explanations:

- High-level system overview
- Component descriptions focused on purpose
- Diagrams when they clarify mental models
- Benefits and trade-offs explained for users
- Links to related guides

### Framework Features Used

#### Tabs

Use tabs for installation methods, runtime variants, or platform-specific instructions.

#### Callouts

- **Tip** - Best practices and shortcuts
- **Warning** - Caveats that prevent user mistakes
- **Note** - Extra context
- **Danger** - High-impact risks or destructive operations

#### Code Blocks

All generated code blocks should include:

- A language identifier
- Runnable or near-runnable examples
- Enough surrounding context to understand the example

#### Diagrams

Generate Mermaid or equivalent diagrams only when supported by the target framework and genuinely helpful.

## Navigation Example

```json
[
  {
    "text": "Getting Started",
    "link": "/guides/getting-started"
  },
  {
    "text": "Guides",
    "collapsible": true,
    "items": [
      {
        "text": "Caching",
        "link": "/guides/caching"
      },
      {
        "text": "Performance",
        "link": "/guides/performance"
      }
    ]
  },
  {
    "text": "Concepts",
    "collapsible": true,
    "items": [
      {
        "text": "Architecture",
        "link": "/concepts/architecture"
      }
    ]
  },
  {
    "text": "API Reference",
    "link": "/api/README"
  }
]
```

## Content Transformation Examples

### Internal Architecture to User Concept

**Internal design note:**

> The system uses fetch, cache, and registry layers composed into one workflow.

**User-facing concept:**

> The package has three main components that work together:
>
> 1. **Fetch Layer** - Retrieves package data
> 2. **Cache Layer** - Stores results locally
> 3. **Registry Layer** - Coordinates the overall workflow
>
> Most users can rely on the default coordination without configuring each part separately.

### Implementation Detail to Usage Guide

**Internal design note:**

> The system generates a virtual file system from fetched package data.

**User guide:**

> Generate a virtual file system:
>
> `const vfs = await registry.generateVFS(['zod@3.22.0']);`
>
> The VFS can then be used with TypeScript tooling.

## Portability Checklist

A portable skill variant should:

- Avoid host-specific commands such as slash-command syntax
- Avoid hard-coded `.claude/` paths
- Prefer repository-local config discovery
- Keep supporting docs inside `references/`
- Keep static templates inside `assets/`
- Use a directory name that matches the frontmatter `name`
