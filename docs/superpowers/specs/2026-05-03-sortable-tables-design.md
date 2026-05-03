# Sortable Tables — Design

**Date:** 2026-05-03
**Status:** Approved — pending user review of written spec

## Goal

Allow users to sort every table in the app by clicking column headers. Sort state lives in URL query parameters so reloading or sharing a link preserves the ordering.

## Non-goals

- Multi-column sort (shift-click for secondary keys).
- Filtering or column-show/hide UI.
- Drag-to-reorder columns.
- Persisting sort preferences per user across sessions (URL-only is enough).

## Decisions

| Decision | Choice |
|---|---|
| Sort UX | Single-column. Click toggles asc → desc → asc. One arrow indicator on the active column. |
| Persistence | URL query params on every table (uniform behavior across the app). |
| Audit Log behavior | Server-side sort across all matching rows (re-query, re-paginate). |
| Pivot column sort key | Activity by Month sorts action columns by `totalItems`. Usage by Staff sorts by `txnCount` (only field available). |
| Reusability | Small `<SortHeader>` component + `sort.ts` utility. Per-page wiring of comparators. No generic `<SortableTable>` — would fight pivot/grouped/paginated variants. |
| Dashboard scope | One sort schema applies to every per-office table consistently (not per-group). |

---

## Section 1 — Architecture & per-table behavior

### New artifacts

- `src/lib/components/app/SortHeader.svelte` — column header component. Props `{ label, field, current, paramPrefix? }`. Renders `<button>` with the label and an arrow indicator (`▲` active asc, `▼` active desc, none when inactive). Click navigates to a new URL with updated sort params via `goto(href, { keepFocus: true, noScroll: true, replaceState: true })`.
- `src/lib/utils/sort.ts` — pure helpers:
  - `parseSortParam(url: URL, prefix?: string): { field: string; dir: 'asc' | 'desc' } | null`
  - `buildSortHref(url: URL, field: string, current: { field; dir } | null, prefix?: string): string`
  - `compareBy<T>(field: keyof T | ((row: T) => unknown), dir: 'asc' | 'desc'): (a: T, b: T) => number` — handles `string`, `number`, `Date`, `null`/`undefined`. Nulls sort last in both directions.
- `src/lib/utils/sort.test.ts` — unit tests for the three helpers.

### Per-table sort behavior

| Table | Sortable columns | Non-sortable | Default | URL prefix |
|---|---|---|---|---|
| Dashboard (per office, all tables share schema) | Product, Qty, Days remaining, Burn rate, Updated | — | Product asc | none (`sort` / `dir`) |
| Reports — Activity by Month | Month, each action col (by `totalItems`), Total items moved | — | Month desc | `history` |
| Reports — Usage by Staff | Staff, each action col (by `txnCount`), Total | — | Total desc¹ | `staff` |
| Audit Log | ID, Action, Office, Performed by, Recorded by, Date | **Items** (multi-line composite) | Date desc | none |
| Reconcile (pending) | Confirmation ID, Office, Submitted by, Date | action col | Date desc | none |
| Reconcile [id] | Product, Physical count, System stock, Discrepancy | — | Product asc | none |
| Admin/Offices | #, Name, Type, Team, Region, Status | action col | # asc | none |
| Admin/Users | Name, Email, Role, Team/Region, Active | action col | Name asc | none |

¹ Behavior change: today the staff pivot renders staff in `Map` insertion order. Switching the default to "Total desc" puts the most active staff at the top, which is what users actually want when no explicit sort is set.

### Dashboard nuance

A single `?sort=qty&dir=desc` re-orders **every** per-office group consistently. Sorting per-group would create an inconsistent reading experience and require N sort params.

### URL handling

- `buildSortHref` preserves all existing query params (`office`, `dateFrom`, `dateTo`, etc.).
- Clicking a header that is already the active sort column toggles direction. Clicking a different header sets it asc.
- Multi-table pages prefix params (`historySort` / `historyDir`, `staffSort` / `staffDir`) so the two tables stay independent.

### Page wiring pattern (client-side tables)

Each page:

1. Parses sort from `page.url` via `parseSortParam`.
2. Computes a sorted derived array using `compareBy`.
3. Renders `<SortHeader>` for sortable columns, plain `<th>` for non-sortable ones.

Sorted array is `$derived` so it reacts to navigation without manual subscription.

---

## Section 2 — Audit Log server-side sort & testing

### Service change

`src/lib/server/services/audit.ts` — `getAuditLog` gets a new optional `sort` parameter:

```ts
type AuditSortField = 'id' | 'action' | 'office' | 'performedBy' | 'recordedBy' | 'date';
type AuditSort = { field: AuditSortField; dir: 'asc' | 'desc' };

getAuditLog(db, schema, filters, pagination, sort?: AuditSort)
```

Field → drizzle column mapping (whitelisted):

| Field | Column |
|---|---|
| `id` | `transactions.confirmationId` |
| `action` | `transactions.actionType` |
| `office` | `offices.officeNumber` |
| `performedBy` | `performedByUser.name` |
| `recordedBy` | `recordedByUser.name` |
| `date` | `transactions.createdAt` |

- **Tie-breaker:** every `orderBy` clause appends `transactions.id desc` for stable cross-page ordering.
- **Default** (when `sort` is undefined): `createdAt desc` — no behavior change for callers that don't pass `sort`.
- **Unknown field:** treat as `undefined`. Tolerant, no 400.

### Route change

`src/routes/(app)/audit-log/+page.server.ts`:

1. Parse `sort` and `dir` from `url.searchParams` via `parseSortParam`.
2. Validate field against the whitelist; drop invalid values.
3. Pass to `getAuditLog`.
4. Return the parsed sort to the page so `<SortHeader>` can render the active arrow.

### Pagination interaction

`buildSortHref` **strips the `page` param** when sort changes. Otherwise a click while on page 7 of an old sort would land you on page 7 of a re-sorted result — disorienting. Resetting to page 0 is the conventional behavior.

### Testing

Unit tests (Vitest, server project):

- `src/lib/utils/sort.test.ts` — `parseSortParam` (with and without prefix, malformed input), `buildSortHref` (toggle, replace, page-reset), `compareBy` for `string` / `number` / `Date` / `null`.
- `src/lib/server/services/audit.test.ts` — extend with: each whitelisted sort field returns rows in the expected order; unknown field falls back to default; sort by `office` works across the joined `offices` table; tie-breaker keeps ordering stable when sort key has duplicates.

No new E2E. The component is shallow; the load-bearing logic is in the comparator and the audit service, both unit-covered. Manual click-through during dev verification covers the integration.

### Files touched

**New:**

- `src/lib/components/app/SortHeader.svelte`
- `src/lib/utils/sort.ts`
- `src/lib/utils/sort.test.ts`

**Modified:**

- `src/lib/server/services/audit.ts` (add sort param, whitelist)
- `src/lib/server/services/audit.test.ts` (extend coverage)
- `src/routes/(app)/audit-log/+page.server.ts` (parse + pass sort)
- `src/routes/(app)/dashboard/+page.svelte`
- `src/routes/(app)/reports/+page.svelte`
- `src/routes/(app)/audit-log/+page.svelte`
- `src/routes/(app)/reconcile/+page.svelte`
- `src/routes/(app)/reconcile/[id]/+page.svelte`
- `src/routes/(app)/admin/offices/+page.svelte`
- `src/routes/(app)/admin/users/+page.svelte`
