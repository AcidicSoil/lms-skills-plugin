---
name: code-refactoring
description: Expert guidance for refactoring large codebases to reduce file sizes, eliminate duplication, and improve maintainability. Use when user asks to "refactor code", "reduce file size", "eliminate duplication", "extract utilities", "split large files", or "organize codebase". Especially helpful for SvelteKit, React, and TypeScript projects.
metadata:
  author: Claude
  version: 1.0.0
  category: code-quality
  tags: [refactoring, code-organization, maintainability]
---

# Code Refactoring Skill

## Purpose
This skill helps you systematically refactor codebases by:
- Identifying code duplication patterns
- Extracting reusable utilities and components
- Splitting large files into focused modules
- Applying consistent architectural patterns

## When to Use
- Files over 500-800 lines
- Duplicated logic across multiple files
- Mixed concerns (UI + business logic + data)
- Hard-to-maintain monolithic components
- Before adding new features to legacy code

## Core Refactoring Principles

### 1. Extract Before You Abstract
Always extract duplicated code first, then abstract if it's used 3+ times.

**Pattern:**
```typescript
// Step 1: Identify duplication
// expenses.svelte.ts, mileage.svelte.ts, income.svelte.ts all have:
function filterByDate(items, start, end) { /* ... */ }

// Step 2: Extract to utility
// src/lib/utils/filters.ts
export function filterByDateRange<T extends { date: string }>(
  items: T[],
  range: { start: string; end: string }
): T[] {
  return items.filter(item => 
    item.date >= range.start && item.date <= range.end
  );
}

// Step 3: Replace in all locations
import { filterByDateRange } from '$lib/utils/filters';
```

### 2. Progressive Disclosure for Components
Break large files into focused components only when they're reused or exceed 600 lines.

**Decision Tree:**
- **Under 400 lines + single use**: Keep as-is
- **400-600 lines + single use**: Extract sections with clear comments
- **600+ lines OR used 2+ places**: Extract components
- **Over 1000 lines**: MUST split regardless of reuse

### 3. Thin Layers Pattern
Each layer should do ONE thing:

```
Pages (100-400 lines)
  ↓ Coordinate components, handle routing
Components (100-300 lines)
  ↓ Render UI, manage local state
Utilities (50-200 lines)
  ↓ Pure functions, calculations
Services (100-400 lines)
  ↓ API calls, external integrations
Stores (200-400 lines)
  ↓ Global state management
```

## Step-by-Step Refactoring Workflow

### Phase 1: Analyze & Plan
1. **Identify duplication:**
   ```bash
   # Find similar code patterns
   grep -r "function filterBy" src/
   ```

2. **Measure file sizes:**
   ```bash
   find src -name "*.svelte" -o -name "*.ts" | \
     xargs wc -l | sort -rn | head -20
   ```

3. **List dependencies:**
   - What imports does this file have?
   - What imports this file?
   - What can be extracted without breaking dependents?

### Phase 2: Extract Utilities First
Start with the **highest ROI** utilities (used in most files):

**Priority order:**
1. **Table/List management** (filtering, sorting, pagination, selection)
2. **Format functions** (currency, dates, categories)
3. **Export/Import** (CSV, PDF generation)
4. **Validation** (form validation, data validation)
5. **Domain calculations** (business logic)

**Example extraction:**
```typescript
// Before: Duplicated in 4 files
// expenses/+page.svelte, mileage/+page.svelte, etc.
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

// After: Single utility
// src/lib/utils/format/currency.ts
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[$,]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
}
```

### Phase 3: Extract Components
Only after utilities are extracted, split UI components.

**Component extraction checklist:**
- [ ] Component has clear single responsibility
- [ ] Props interface is well-defined
- [ ] Component is reused OR parent is over 600 lines
- [ ] All business logic moved to utilities
- [ ] Event handlers are thin (just call utilities)

**Example:**
```svelte
<!-- Before: 2300-line expenses page -->
<script lang="ts">
  // 200 lines of filter logic
  // 300 lines of table rendering
  // 150 lines of selection logic
  // 100 lines of export logic
  // ... etc
</script>

<!-- After: 400-line coordinator -->
<script lang="ts">
  import { filterRecords, sortRecords } from '$lib/utils/table/filters';
  import { createSelectionManager } from '$lib/utils/table/selection';
  import { exportToCsv } from '$lib/utils/exports/csv';
  
  import ExpenseFilters from './components/ExpenseFilters.svelte';
  import ExpenseTable from './components/ExpenseTable.svelte';
  import ExpenseSummary from './components/ExpenseSummary.svelte';
  
  // Just coordination logic here (100-200 lines)
  let searchQuery = $state('');
  let dateRange = $state({ start: '', end: '' });
  
  const selection = createSelectionManager();
  const filtered = $derived(
    filterRecords($expenses, { searchQuery, dateRange })
  );
</script>

<ExpenseSummary data={filtered} />
<ExpenseFilters bind:search={searchQuery} bind:dateRange />
<ExpenseTable 
  items={filtered}
  {selection}
  onedit={handleEdit}
  ondelete={handleDelete}
/>
```

### Phase 4: Split Stores
For stores over 800 lines, split by responsibility:

```
src/lib/stores/trips/
  ├── index.ts          (100 lines - public API)
  ├── state.svelte.ts   (200 lines - reactive state)
  ├── queries.ts        (250 lines - fetching/filtering)
  ├── mutations.ts      (300 lines - create/update/delete)
  ├── sync.ts           (250 lines - cloud sync)
  └── selectors.ts      (200 lines - derived data)
```

**Pattern:**
```typescript
// index.ts - Clean public API
export { trips, isLoading } from './state.svelte';
export { loadTrips, searchTrips } from './queries';
export { createTrip, updateTrip, deleteTrip } from './mutations';
export { syncToCloud } from './sync';
export { getTripStats } from './selectors';
```

### Phase 5: Thin API Endpoints
API routes should be **100-200 lines max**. All business logic goes in services.

**Before (1691 lines):**
```typescript
// src/routes/api/trips/+server.ts
export async function POST({ request, locals }) {
  // 300 lines of validation
  // 400 lines of business logic
  // 200 lines of database operations
  // 150 lines of error handling
}
```

**After (150 lines):**
```typescript
// src/routes/api/trips/+server.ts
import { createTrip, listTrips } from '$lib/server/tripService';
import { validateTripData } from '$lib/server/validation/trips';

export async function POST({ request, locals }) {
  const userId = await getUserId(locals);
  const data = await request.json();
  
  const validated = await validateTripData(data);
  const trip = await createTrip(userId, validated);
  
  return json(trip);
}

export async function GET({ locals, url }) {
  const userId = await getUserId(locals);
  const filters = parseFilters(url.searchParams);
  const trips = await listTrips(userId, filters);
  
  return json(trips);
}

// Business logic in src/lib/server/tripService.ts (400 lines)
// Validation in src/lib/server/validation/trips.ts (200 lines)
```

## Common Patterns

### Pattern: Table Management
**Use for:** Any page with filtering, sorting, pagination, selection

```typescript
// src/lib/utils/table/core.ts
export interface TableConfig<T> {
  items: T[];
  filters: FilterConfig;
  sort: SortConfig;
  pagination: PaginationConfig;
  selection?: SelectionConfig;
}

export function createTableManager<T extends { id: string }>(
  config: TableConfig<T>
) {
  // Returns reactive state + methods
  // Reuse in expenses, mileage, income, trips pages
}
```

### Pattern: Form Sections
**Use for:** Forms over 400 lines

```svelte
<!-- Instead of one 2000-line form -->
<TripForm />

<!-- Split into sections -->
<TripBasicInfo bind:data />
<TripStopsEditor bind:stops />
<TripCostInputs bind:costs />
<TripSchedule bind:schedule />
```

### Pattern: Swipe Actions
**Use for:** Mobile-friendly lists with actions

```typescript
// src/lib/actions/swipe.ts
export function swipe(
  node: HTMLElement,
  config: { onLeft?: () => void; onRight?: () => void }
) {
  // Reusable Svelte action
  // Use in expenses, trips, mileage lists
}
```

## Anti-Patterns to Avoid

❌ **Over-abstraction:**
```typescript
// Don't create generic "do everything" components
<SuperDataTable 
  config={massiveConfigObject}
  renderCell={customRenderer}
  // ... 30 more props
/>
```

✅ **Right level of abstraction:**
```typescript
// Create focused, composable components
<DataTable items={data} columns={cols} />
<FilterBar config={filters} />
<Pagination state={page} />
```

❌ **Premature extraction:**
```typescript
// Don't extract after first use
// File 1: function doThing() { }
// Immediately create: utils/doThing.ts
```

✅ **Wait for duplication:**
```typescript
// Extract after 2nd use
// File 1: function doThing() { }
// File 2: function doThing() { } // <- Now extract
// utils/doThing.ts
```

❌ **Kitchen sink utilities:**
```typescript
// utils/helpers.ts (3000 lines of random functions)
export function everything() { }
```

✅ **Focused utilities:**
```typescript
// utils/format/currency.ts
// utils/format/dates.ts
// utils/validation/email.ts
```

## Testing Strategy

After each refactor:

1. **Smoke test:** Does it still work?
2. **Feature test:** Do all features work as before?
3. **Edge cases:** Test boundary conditions
4. **Performance:** Is it faster/same/slower?

**Quick verification:**
```bash
# Run your test suite
npm test

# Manual checks
# - Search still works
# - Filters still work
# - Create/edit/delete still work
# - Offline mode still works
```

## Measuring Success

**Before/After metrics:**
- File count (should increase slightly)
- Largest file size (should decrease significantly)
- Duplicated code (should decrease significantly)
- Time to add new feature (should decrease)
- Time to fix bug (should decrease)

**Example:**
```
Before refactor:
- expenses/+page.svelte: 2311 lines
- mileage/+page.svelte: 2200 lines
- Duplicated filter logic: ~600 lines total

After refactor:
- expenses/+page.svelte: 450 lines
- mileage/+page.svelte: 400 lines
- lib/utils/table/filters.ts: 200 lines (reused 5×)
- Net savings: ~2400 lines
```

## Quick Reference

### File Size Guidelines
- **Utilities:** 50-200 lines
- **Components:** 100-300 lines
- **Pages:** 200-600 lines
- **Stores:** 200-400 lines (or split into modules)
- **API routes:** 100-200 lines
- **Services:** 200-600 lines

### When to Extract
- **Duplication:** Used in 2+ files → extract
- **Length:** Over 600 lines → split
- **Complexity:** Hard to understand → simplify
- **Coupling:** Too many dependencies → break apart

### Refactoring Order
1. **Week 1:** Extract utilities (highest ROI)
2. **Week 2:** Refactor largest pages
3. **Week 3:** Split large stores
4. **Week 4:** Thin API routes
5. **Week 5:** Polish and optimize

## Getting Help

If stuck, ask:
- "What's duplicated across these files?"
- "How should I split this 2000-line file?"
- "What utilities can I extract from this code?"
- "Is this component doing too much?"
- "How can I test this refactor safely?"
