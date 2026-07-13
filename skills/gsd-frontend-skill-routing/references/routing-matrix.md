# Frontend/UI Skill Routing Matrix

Use this matrix to route browser-facing frontend work to copied skill guidance under `skills/frontend-ui-design-skills-copy/`.

## Core routing table

| Work type | Primary copied skills | Apply when | Evidence expectation |
|-----------|-----------------------|------------|----------------------|
| Accessibility, keyboard, focus, ARIA, screen reader, reduced motion | `skills/frontend-ui-design-skills-copy/accessibility/SKILL.md` | UI changes affect semantics, navigation, focus, overlays, keyboard use, screen readers, motion preferences, or cognitive load | Browser evidence should include exercised keyboard/focus path or explicit accessibility check where relevant. |
| Responsive layouts, mobile behavior, container queries, fluid typography | `skills/frontend-ui-design-skills-copy/responsive-patterns/SKILL.md` | Layout must work across viewport/container sizes, mobile, foldable, or adaptive surfaces | Evidence should include responsive viewport or layout inspection expectations. |
| UI components, shadcn/Radix, forms, empty states, typography, component states | `skills/frontend-ui-design-skills-copy/ui-components/SKILL.md` | Building or changing reusable components, forms, dialogs, menus, cards, empty states, or design-system foundations | Evidence should prove visual state and interaction behavior, not just compile success. |
| Design systems, tokens, theme, OKLCH, color, spacing | `skills/frontend-ui-design-skills-copy/design-system-tokens/SKILL.md` and `skills/frontend-ui-design-skills-copy/ui-components/SKILL.md` | Work touches tokens, theming, CSS variables, color systems, spacing scales, typography, or component variants | Evidence should include visual consistency and token/theming checks. |
| Interaction patterns, loading states, skeletons, progressive disclosure, overlays, drag/drop, notifications | `skills/frontend-ui-design-skills-copy/interaction-patterns/SKILL.md` | Work changes user-flow behavior, modal/drawer/inline selection, toasts, loading states, drag/drop, or tab overflow | Evidence should exercise the interaction path in browser. |
| Animation, transitions, micro-interactions, gestures | `skills/frontend-ui-design-skills-copy/animation-motion-design/SKILL.md` plus `skills/frontend-ui-design-skills-copy/accessibility/SKILL.md` | Motion, page transitions, gestures, or animation states are part of the change | Evidence should include motion behavior and reduced-motion consideration. |
| Design-to-code from mockup, screenshot, description, URL, or visual target | `skills/frontend-ui-design-skills-copy/design-to-code/SKILL.md`, `skills/frontend-ui-design-skills-copy/design-context-extract/SKILL.md`, and when applicable `skills/frontend-ui-design-skills-copy/figma-design-handoff/SKILL.md` | Implementing visual design, mockup, imported design bundle, Figma handoff, screenshot-matching, or UI from prompt | Evidence should include before/after or target-vs-result visual inspection. |
| Storybook stories, component documentation, visual regression, component interaction tests | `skills/frontend-ui-design-skills-copy/storybook-testing/SKILL.md` and `skills/frontend-ui-design-skills-copy/storybook-mcp-integration/SKILL.md` | Work creates reusable components, stories, component tests, docs, or Storybook previews | Evidence should include story/test expectations or browser/component preview where available. |
| E2E/browser testing, Playwright, visual regression, accessibility testing | `skills/frontend-ui-design-skills-copy/testing-e2e/SKILL.md` plus `skills/gsd-browser-evidence-verification/SKILL.md` | Work needs end-to-end flow coverage, changed UI verification, visual regression, or accessibility test automation | Evidence should include route, action path, screenshot, and pass/fail result. |
| Performance, Core Web Vitals, render optimization, images, lazy loading, bundles | `skills/frontend-ui-design-skills-copy/performance/SKILL.md` | Work affects page speed, rendering, bundle size, images, lazy loading, data fetching performance, or slow UI | Evidence should include performance metric/test expectation when practical. |

## Conditional frontend-adjacent routing

| Work type | Conditional copied skills | Apply when |
|-----------|---------------------------|------------|
| API contract coupled to frontend behavior | `skills/frontend-ui-design-skills-copy/api-design/SKILL.md` | UI work changes endpoint shape, error handling, pagination, filtering, optimistic updates, or OpenAPI-visible behavior. |
| Data model or migration visible through frontend | `skills/frontend-ui-design-skills-copy/database-patterns/SKILL.md` | UI work depends on schema, persistence, migrations, or data-shape changes. |
| Zustand state management | `skills/frontend-ui-design-skills-copy/zustand-patterns/SKILL.md` | React state logic, slices, middleware, persistence, or selectors use Zustand. |
| React Server Components / Next.js App Router | `skills/frontend-ui-design-skills-copy/react-server-components-framework/SKILL.md` | Work touches RSC, server actions, streaming SSR, App Router, cache components, or server-first architecture. |
| Vite build or frontend bundling | `skills/frontend-ui-design-skills-copy/vite-advanced/SKILL.md` | Work touches Vite config, plugins, SSR, library mode, or build optimization. |
| i18n, localized strings, dates, currency, RTL | `skills/frontend-ui-design-skills-copy/i18n-date-patterns/SKILL.md` | UI work includes localization, date/time/currency formatting, pluralization, ICU messages, or RTL. |
| AI-generated UI review/integration | `skills/frontend-ui-design-skills-copy/ai-ui-generation/SKILL.md` | UI was generated with AI or needs review for design-system conformance and quality gates. |
| Component sourcing from registry | `skills/frontend-ui-design-skills-copy/component-search/SKILL.md` | Agent needs production-ready component candidates or design-system building blocks. |
| Browser/dev-loop patterns | `skills/frontend-ui-design-skills-copy/browser-tools/SKILL.md`, `skills/frontend-ui-design-skills-copy/dev/SKILL.md`, and `skills/frontend-ui-design-skills-copy/expect/SKILL.md` | Use only as reference when local tooling matches. Do not replace `skills/gsd-browser-automation/SKILL.md` or `skills/gsd-browser-evidence-verification/SKILL.md`. |

## Routing workflow

1. Identify all frontend work types in the task.
2. Select primary and conditional copied skills from the matrix.
3. Read selected copied `SKILL.md` files before planning or implementing.
4. Read copied rule/reference files only when the selected skill directs it and the task needs that depth.
5. Record considered/applied/skipped skills with the compact record below.
6. Pair selected frontend skills with GSD Browser evidence rules when the work is browser-facing.

## Compact routing record

| Work Type | Skills considered | Skills applied | Skipped with reason | Evidence expectation |
|-----------|-------------------|----------------|---------------------|----------------------|
| `<frontend work type>` | `<copied skill paths considered>` | `<copied skill paths read and applied>` | `<skill path or category + reason>` | `<browser/design/test evidence expected>` |

## Example records

| Work Type | Skills considered | Skills applied | Skipped with reason | Evidence expectation |
|-----------|-------------------|----------------|---------------------|----------------------|
| Modal component with keyboard behavior | `accessibility`, `ui-components`, `interaction-patterns`, `testing-e2e` | `skills/frontend-ui-design-skills-copy/accessibility/SKILL.md`; `skills/frontend-ui-design-skills-copy/ui-components/SKILL.md`; `skills/frontend-ui-design-skills-copy/interaction-patterns/SKILL.md` | `testing-e2e` skipped until Phase 4 workflow integration unless plan already includes test changes | Browser screenshot plus focus/keyboard action path. |
| Responsive dashboard layout | `responsive-patterns`, `ui-components`, `performance`, `accessibility` | `skills/frontend-ui-design-skills-copy/responsive-patterns/SKILL.md`; `skills/frontend-ui-design-skills-copy/ui-components/SKILL.md` | `performance` skipped if no measurable performance-sensitive change | Browser screenshots at relevant viewport/container sizes. |
| Mockup to React component | `design-to-code`, `design-context-extract`, `ui-components`, `accessibility`, `responsive-patterns` | `skills/frontend-ui-design-skills-copy/design-to-code/SKILL.md`; `skills/frontend-ui-design-skills-copy/ui-components/SKILL.md`; `skills/frontend-ui-design-skills-copy/accessibility/SKILL.md` | `figma-design-handoff` skipped when there is no Figma handoff | Target-vs-result visual inspection plus browser screenshot. |

## Scope reminders

- Do not modify the copied frontend skill source tree when using this matrix.
- Do not claim a skill was applied unless selected guidance changed the plan, implementation, or evidence expectation.
- Do not read every copied skill for every task.
- Phase 4 wires this record into GSD planning/execution/summary/verification guidance.
