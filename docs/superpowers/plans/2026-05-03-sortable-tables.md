# Sortable Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add click-to-sort column headers to every table in the app. Sort state lives in URL query parameters; Audit Log sorts server-side, all other tables sort client-side.

**Architecture:** A small `<SortHeader>` Svelte component renders the column header and an arrow indicator; it navigates to a new URL with updated sort params on click. A pure `sort.ts` utility module handles URL parsing/building and provides a `compareBy` comparator for client-side sorting. The Audit Log service accepts a whitelisted `sort` parameter and translates it to a Drizzle `orderBy` clause with a stable tie-breaker.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, Drizzle ORM, Vitest (unit tests).

**Spec:** `docs/superpowers/specs/2026-05-03-sortable-tables-design.md`

---

## File Structure

**New files:**

- `src/lib/utils/sort.ts` — pure helpers: `parseSortParam`, `buildSortHref`, `compareBy`. Single responsibility: URL ↔ sort state, plus a generic comparator.
- `src/lib/utils/sort.test.ts` — Vitest unit coverage.
- `src/lib/components/app/SortHeader.svelte` — column-header button. Renders label + arrow, navigates on click.

**Modified files:**

- `src/lib/server/services/audit.ts` — add `sort?: AuditSort` parameter; translate to Drizzle `orderBy` using aliased user joins.
- `src/lib/server/services/audit.test.ts` — extend with sort coverage.
- `src/routes/(app)/audit-log/+page.server.ts` — parse sort from URL, pass to service and page.
- `src/routes/(app)/audit-log/+page.svelte` — replace `<th>` with `<SortHeader>` (skip Items column).
- `src/routes/(app)/dashboard/+page.svelte` — sort each per-office group with shared schema.
- `src/routes/(app)/reports/+page.svelte` — sort both pivots independently (`history` and `staff` prefixes).
- `src/routes/(app)/reconcile/+page.svelte`
- `src/routes/(app)/reconcile/[id]/+page.svelte`
- `src/routes/(app)/admin/offices/+page.svelte`
- `src/routes/(app)/admin/users/+page.svelte`

---

## Task 1: Sort utility module (TDD)

**Files:**

- Create: `src/lib/utils/sort.ts`
- Create: `src/lib/utils/sort.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/utils/sort.test.ts`:

```ts
// src/lib/utils/sort.test.ts
import { describe, it, expect } from 'vitest';
import { parseSortParam, buildSortHref, compareBy } from './sort.js';

describe('parseSortParam', () => {
  it('returns null when sort param is absent', () => {
    expect(parseSortParam(new URL('http://x/p'))).toBeNull();
  });

  it('returns null when sort param is empty', () => {
    expect(parseSortParam(new URL('http://x/p?sort='))).toBeNull();
  });

  it('defaults dir to asc when missing', () => {
    expect(parseSortParam(new URL('http://x/p?sort=name'))).toEqual({ field: 'name', dir: 'asc' });
  });

  it('reads dir=desc', () => {
    expect(parseSortParam(new URL('http://x/p?sort=name&dir=desc'))).toEqual({ field: 'name', dir: 'desc' });
  });

  it('treats unknown dir as asc', () => {
    expect(parseSortParam(new URL('http://x/p?sort=name&dir=zzz'))).toEqual({ field: 'name', dir: 'asc' });
  });

  it('honors a prefix', () => {
    const u = new URL('http://x/p?historySort=month&historyDir=desc');
    expect(parseSortParam(u, 'history')).toEqual({ field: 'month', dir: 'desc' });
    expect(parseSortParam(u)).toBeNull();
  });
});

describe('buildSortHref', () => {
  it('sets sort=field&dir=asc on a fresh column click', () => {
    const u = new URL('http://x/p');
    expect(buildSortHref(u, 'name', null)).toBe('/p?sort=name&dir=asc');
  });

  it('toggles asc → desc when clicking the active column', () => {
    const u = new URL('http://x/p?sort=name&dir=asc');
    expect(buildSortHref(u, 'name', { field: 'name', dir: 'asc' })).toBe('/p?sort=name&dir=desc');
  });

  it('toggles desc → asc when clicking the active column', () => {
    const u = new URL('http://x/p?sort=name&dir=desc');
    expect(buildSortHref(u, 'name', { field: 'name', dir: 'desc' })).toBe('/p?sort=name&dir=asc');
  });

  it('replaces with asc when clicking a different column', () => {
    const u = new URL('http://x/p?sort=name&dir=desc');
    expect(buildSortHref(u, 'qty', { field: 'name', dir: 'desc' })).toBe('/p?sort=qty&dir=asc');
  });

  it('preserves unrelated query params', () => {
    const u = new URL('http://x/p?office=o1&dateFrom=2026-01-01');
    const href = buildSortHref(u, 'date', null);
    expect(href).toContain('office=o1');
    expect(href).toContain('dateFrom=2026-01-01');
    expect(href).toContain('sort=date');
    expect(href).toContain('dir=asc');
  });

  it('strips the page param when sort changes', () => {
    const u = new URL('http://x/p?page=5&sort=name&dir=asc');
    const href = buildSortHref(u, 'name', { field: 'name', dir: 'asc' });
    expect(href).not.toContain('page=');
  });

  it('honors a prefix', () => {
    const u = new URL('http://x/p');
    expect(buildSortHref(u, 'month', null, 'history')).toBe('/p?historySort=month&historyDir=asc');
  });
});

describe('compareBy', () => {
  it('sorts strings ascending with localeCompare', () => {
    const rows = [{ n: 'banana' }, { n: 'apple' }, { n: 'cherry' }];
    rows.sort(compareBy<{ n: string }>((r) => r.n, 'asc'));
    expect(rows.map((r) => r.n)).toEqual(['apple', 'banana', 'cherry']);
  });

  it('sorts strings descending', () => {
    const rows = [{ n: 'banana' }, { n: 'apple' }, { n: 'cherry' }];
    rows.sort(compareBy<{ n: string }>((r) => r.n, 'desc'));
    expect(rows.map((r) => r.n)).toEqual(['cherry', 'banana', 'apple']);
  });

  it('sorts numbers ascending', () => {
    const rows = [{ q: 10 }, { q: 2 }, { q: 30 }];
    rows.sort(compareBy<{ q: number }>((r) => r.q, 'asc'));
    expect(rows.map((r) => r.q)).toEqual([2, 10, 30]);
  });

  it('sorts dates ascending', () => {
    const rows = [
      { d: new Date('2026-03-01') },
      { d: new Date('2026-01-01') },
      { d: new Date('2026-02-01') },
    ];
    rows.sort(compareBy<{ d: Date }>((r) => r.d, 'asc'));
    expect(rows.map((r) => r.d.toISOString().slice(0, 10))).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('puts nulls last in asc', () => {
    const rows = [{ q: 10 }, { q: null }, { q: 2 }];
    rows.sort(compareBy<{ q: number | null }>((r) => r.q, 'asc'));
    expect(rows.map((r) => r.q)).toEqual([2, 10, null]);
  });

  it('puts nulls last in desc as well', () => {
    const rows = [{ q: 10 }, { q: null }, { q: 2 }];
    rows.sort(compareBy<{ q: number | null }>((r) => r.q, 'desc'));
    expect(rows.map((r) => r.q)).toEqual([10, 2, null]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```sh
npm run test:unit -- --run src/lib/utils/sort.test.ts
```

Expected: FAIL — module `./sort.js` not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/sort.ts`:

```ts
// src/lib/utils/sort.ts
export type SortDir = 'asc' | 'desc';
export interface SortState { field: string; dir: SortDir }

function keys(prefix: string): { sortKey: string; dirKey: string } {
  return prefix
    ? { sortKey: `${prefix}Sort`, dirKey: `${prefix}Dir` }
    : { sortKey: 'sort',          dirKey: 'dir' };
}

export function parseSortParam(url: URL, prefix = ''): SortState | null {
  const { sortKey, dirKey } = keys(prefix);
  const field = url.searchParams.get(sortKey);
  if (!field) return null;
  const dir: SortDir = url.searchParams.get(dirKey) === 'desc' ? 'desc' : 'asc';
  return { field, dir };
}

export function buildSortHref(
  url: URL,
  field: string,
  current: SortState | null,
  prefix = '',
): string {
  const { sortKey, dirKey } = keys(prefix);
  const next = new URL(url.href);
  next.searchParams.set(sortKey, field);
  if (current && current.field === field) {
    next.searchParams.set(dirKey, current.dir === 'asc' ? 'desc' : 'asc');
  } else {
    next.searchParams.set(dirKey, 'asc');
  }
  next.searchParams.delete('page');
  return next.pathname + next.search;
}

export function compareBy<T>(
  getter: (row: T) => unknown,
  dir: SortDir,
): (a: T, b: T) => number {
  const sign = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    const av = getter(a);
    const bv = getter(b);
    const aNull = av === null || av === undefined;
    const bNull = bv === null || bv === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return 1;
    if (bNull) return -1;
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * sign;
    if (av instanceof Date && bv instanceof Date)         return (av.getTime() - bv.getTime()) * sign;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
    return String(av).localeCompare(String(bv)) * sign;
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```sh
npm run test:unit -- --run src/lib/utils/sort.test.ts
```

Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```sh
git add src/lib/utils/sort.ts src/lib/utils/sort.test.ts
git commit -m "Added sort utility for URL-driven table sorting"
```

---

## Task 2: SortHeader component

**Files:**

- Create: `src/lib/components/app/SortHeader.svelte`

No test (UI component, manually verified during page-wiring tasks).

- [ ] **Step 1: Create the component**

Create `src/lib/components/app/SortHeader.svelte`:

```svelte
<!-- src/lib/components/app/SortHeader.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { buildSortHref, type SortState } from '$lib/utils/sort.js';

  let {
    label,
    field,
    current = null,
    paramPrefix = '',
    align = 'left',
    class: cls = '',
  }: {
    label: string;
    field: string;
    current?: SortState | null;
    paramPrefix?: string;
    align?: 'left' | 'right';
    class?: string;
  } = $props();

  const isActive = $derived(current?.field === field);
  const arrow    = $derived(isActive ? (current!.dir === 'asc' ? '▲' : '▼') : '');

  async function onClick() {
    const href = buildSortHref(page.url, field, current ?? null, paramPrefix);
    await goto(href, { keepFocus: true, noScroll: true, replaceState: true });
  }
</script>

<button
  type="button"
  onclick={onClick}
  class="inline-flex items-center gap-1 hover:text-gray-700 cursor-pointer {align === 'right' ? 'flex-row-reverse w-full justify-start' : ''} {cls}"
>
  <span>{label}</span>
  {#if arrow}
    <span class="text-xs text-gray-400">{arrow}</span>
  {:else}
    <span class="text-xs text-transparent">▲</span>
  {/if}
</button>
```

(The transparent placeholder arrow keeps column widths from jumping when sort is toggled.)

- [ ] **Step 2: Verify the component compiles**

```sh
npm run check
```

Expected: 0 errors, 0 warnings related to `SortHeader.svelte`.

- [ ] **Step 3: Commit**

```sh
git add src/lib/components/app/SortHeader.svelte
git commit -m "Added SortHeader component for column-click sorting"
```

---

## Task 3: Audit service — server-side sort (TDD)

**Files:**

- Modify: `src/lib/server/services/audit.ts`
- Modify: `src/lib/server/services/audit.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/server/services/audit.test.ts` (inside the existing `describe('getAuditLog', ...)` block, before the closing `});`):

```ts
  describe('with sort parameter', () => {
    beforeEach(async () => {
      // Three transactions with different actions and different performers,
      // created with a slight delay so createdAt ordering is deterministic.
      const otherUserId = seedTestUser(ctx.db, { name: 'Alice', role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test' });
      await createTransaction(ctx.db, ctx.schema, supervisor, {
        action: 'receive', officeId: 'office-test', performedByUserId: supervisorId,
        lineItems: [{ productId: 'prod-test', quantity: 1 }],
      });
      await new Promise((r) => setTimeout(r, 5));
      await createTransaction(ctx.db, ctx.schema, supervisor, {
        action: 'remove', officeId: 'office-test', performedByUserId: otherUserId,
        lineItems: [{ productId: 'prod-test', quantity: 1 }],
      });
      await new Promise((r) => setTimeout(r, 5));
      await createTransaction(ctx.db, ctx.schema, supervisor, {
        action: 'return', officeId: 'office-test', performedByUserId: supervisorId,
        lineItems: [{ productId: 'prod-test', quantity: 1 }],
      });
    });

    it('sorts by action ascending', async () => {
      const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {}, {}, { field: 'action', dir: 'asc' });
      expect(rows.map((r: { action: string }) => r.action)).toEqual(['receive', 'remove', 'return']);
    });

    it('sorts by action descending', async () => {
      const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {}, {}, { field: 'action', dir: 'desc' });
      expect(rows.map((r: { action: string }) => r.action)).toEqual(['return', 'remove', 'receive']);
    });

    it('sorts by date ascending (oldest first)', async () => {
      const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {}, {}, { field: 'date', dir: 'asc' });
      expect(rows[0].action).toBe('receive');
      expect(rows[2].action).toBe('return');
    });

    it('sorts by performedBy user name ascending (Alice before Sup)', async () => {
      const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {}, {}, { field: 'performedBy', dir: 'asc' });
      expect(rows[0].performedByName).toBe('Alice');
    });

    it('sorts by office number', async () => {
      const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {}, {}, { field: 'office', dir: 'asc' });
      // Only one office in scope; assertion is that the call doesn't throw and returns rows.
      expect(rows.length).toBe(3);
    });

    it('falls back to default ordering on unknown field', async () => {
      // @ts-expect-error - intentionally invalid field
      const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {}, {}, { field: 'bogus', dir: 'asc' });
      // Default is createdAt desc — newest first
      expect(rows[0].action).toBe('return');
      expect(rows[2].action).toBe('receive');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```sh
npm run test:unit -- --run src/lib/server/services/audit.test.ts
```

Expected: FAIL — `getAuditLog` does not accept a sixth argument; the new tests fail to compile or assert ordering incorrectly.

- [ ] **Step 3: Modify the audit service**

Replace `src/lib/server/services/audit.ts` entirely:

```ts
// src/lib/server/services/audit.ts
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { getOfficeIdsForUser } from './scope.js';
import type { SessionUser, InventoryAction } from '$lib/types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any; type AnySchema = any;

export interface AuditFilters {
  officeId?:          string;
  action?:            InventoryAction;
  performedByUserId?: string;
  dateFrom?:          string;
  dateTo?:            string;
}

export type AuditSortField = 'id' | 'action' | 'office' | 'performedBy' | 'recordedBy' | 'date';
export interface AuditSort { field: AuditSortField; dir: 'asc' | 'desc' }

export const AUDIT_SORT_FIELDS: ReadonlySet<AuditSortField> = new Set([
  'id', 'action', 'office', 'performedBy', 'recordedBy', 'date',
]);

const DEFAULT_PAGE_SIZE = 50;

export async function getAuditLog(
  db:      AnyDB,
  schema:  AnySchema,
  user:    SessionUser,
  filters: AuditFilters,
  paging:  { page?: number; pageSize?: number } = {},
  sort?:   AuditSort,
) {
  const officeIds = await getOfficeIdsForUser(db, schema, user);
  if (!officeIds.length) return { rows: [], total: 0 };

  const page     = paging.page     ?? 0;
  const pageSize = paging.pageSize ?? DEFAULT_PAGE_SIZE;

  const conditions = [inArray(schema.transactions.officeId, officeIds)];
  if (filters.officeId)          conditions.push(eq(schema.transactions.officeId,          filters.officeId));
  if (filters.action)            conditions.push(eq(schema.transactions.action,            filters.action));
  if (filters.performedByUserId) conditions.push(eq(schema.transactions.performedByUserId, filters.performedByUserId));
  if (filters.dateFrom)          conditions.push(gte(schema.transactions.createdAt,        filters.dateFrom));
  if (filters.dateTo)            conditions.push(lte(schema.transactions.createdAt,        filters.dateTo + 'T23:59:59Z'));

  const where = and(...conditions);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.transactions)
    .where(where);
  const total = Number(count);

  const performer = alias(schema.users, 'performer');
  const recorder  = alias(schema.users, 'recorder');

  const sortField = sort && AUDIT_SORT_FIELDS.has(sort.field) ? sort.field : null;
  const dirFn = sort?.dir === 'asc' ? asc : desc;

  const orderByClauses = (() => {
    switch (sortField) {
      case 'id':          return [dirFn(schema.transactions.confirmationId)];
      case 'action':      return [dirFn(schema.transactions.action)];
      case 'office':      return [dirFn(schema.offices.officeNumber)];
      case 'performedBy': return [dirFn(performer.name)];
      case 'recordedBy':  return [dirFn(recorder.name)];
      case 'date':        return [dirFn(schema.transactions.createdAt)];
      default:            return [desc(schema.transactions.createdAt)];
    }
  })();
  // Stable tie-breaker for cross-page ordering.
  orderByClauses.push(desc(schema.transactions.id));

  const txns = await db
    .select({
      id:                schema.transactions.id,
      confirmationId:    schema.transactions.confirmationId,
      action:            schema.transactions.action,
      officeId:          schema.transactions.officeId,
      officeName:        schema.offices.name,
      officeNumber:      schema.offices.officeNumber,
      performedByUserId: schema.transactions.performedByUserId,
      recordedByUserId:  schema.transactions.recordedByUserId,
      notes:             schema.transactions.notes,
      createdAt:         schema.transactions.createdAt,
      performedByName:   performer.name,
      recordedByName:    recorder.name,
    })
    .from(schema.transactions)
    .innerJoin(schema.offices, eq(schema.transactions.officeId,        schema.offices.id))
    .innerJoin(performer,      eq(schema.transactions.performedByUserId, performer.id))
    .innerJoin(recorder,       eq(schema.transactions.recordedByUserId,  recorder.id))
    .where(where)
    .orderBy(...orderByClauses)
    .limit(pageSize)
    .offset(page * pageSize);

  if (!txns.length) return { rows: [], total };

  const txnIds = txns.map((t: { id: string }) => t.id);
  const lineItemRows = await db
    .select({
      transactionId: schema.transactionLineItems.transactionId,
      productId:     schema.transactionLineItems.productId,
      productName:   schema.products.name,
      quantity:      schema.transactionLineItems.quantity,
      otherDesc:     schema.transactionLineItems.otherDescription,
    })
    .from(schema.transactionLineItems)
    .innerJoin(schema.products, eq(schema.transactionLineItems.productId, schema.products.id))
    .where(inArray(schema.transactionLineItems.transactionId, txnIds));

  const lineItemMap = new Map<string, typeof lineItemRows>();
  for (const li of lineItemRows) {
    const list = lineItemMap.get(li.transactionId) ?? [];
    list.push(li);
    lineItemMap.set(li.transactionId, list);
  }

  const rows = txns.map((t: {
    id: string; confirmationId: string; action: string;
    officeId: string; officeName: string; officeNumber: string;
    performedByUserId: string; recordedByUserId: string;
    performedByName: string; recordedByName: string;
    notes: string | null; createdAt: string;
  }) => ({
    ...t,
    lineItems: lineItemMap.get(t.id) ?? [],
  }));

  return { rows, total };
}
```

Key changes from the original file:

- Imports `asc`, `alias` from `drizzle-orm` and `drizzle-orm/sqlite-core`.
- Adds `AuditSortField`, `AuditSort` exports + `VALID_SORT_FIELDS` whitelist.
- Adds `sort?: AuditSort` parameter (sixth arg).
- Aliases `users` twice (`performer`, `recorder`) and joins both, so `name` is fetchable in one query and sortable.
- Drops the second user-lookup query (no longer needed).
- `orderBy` is dynamic via the `switch`, with a `desc(transactions.id)` tie-breaker.

- [ ] **Step 4: Run tests to verify they pass**

```sh
npm run test:unit -- --run src/lib/server/services/audit.test.ts
```

Expected: PASS — all original tests still pass plus the six new sort tests.

- [ ] **Step 5: Commit**

```sh
git add src/lib/server/services/audit.ts src/lib/server/services/audit.test.ts
git commit -m "Added server-side sort to getAuditLog"
```

---

## Task 4: Audit Log route + page wiring

**Files:**

- Modify: `src/routes/(app)/audit-log/+page.server.ts`
- Modify: `src/routes/(app)/audit-log/+page.svelte`

- [ ] **Step 1: Read the current route loader**

```sh
cat src/routes/\(app\)/audit-log/+page.server.ts
```

You should see the loader parsing filters and pagination from `url.searchParams`. You'll add sort parsing alongside.

- [ ] **Step 2: Modify the route loader**

In `src/routes/(app)/audit-log/+page.server.ts`, add the sort import + parsing and pass to the service. Around the existing `getAuditLog(...)` call:

Add to the imports at the top:

```ts
import { parseSortParam } from '$lib/utils/sort.js';
import { AUDIT_SORT_FIELDS, type AuditSortField, type AuditSort } from '$lib/server/services/audit.js';
```

In the `load` function, after parsing pagination, before the `getAuditLog` call:

```ts
const parsed = parseSortParam(url);
const sort: AuditSort | undefined =
  parsed && AUDIT_SORT_FIELDS.has(parsed.field as AuditSortField)
    ? { field: parsed.field as AuditSortField, dir: parsed.dir }
    : undefined;
```

Then pass `sort` as the sixth argument:

```ts
const { rows, total } = await getAuditLog(db, schema, user, filters, { page, pageSize }, sort);
```

And include `sort` in the returned object:

```ts
return { rows, total, filters, page, pageSize, totalPages, ..., sort: sort ?? null };
```

(Match the existing return shape — just add `sort: sort ?? null`.)

- [ ] **Step 3: Modify the page to render SortHeader**

In `src/routes/(app)/audit-log/+page.svelte`, add to the script block:

```ts
import SortHeader from '$lib/components/app/SortHeader.svelte';
```

Add a `$derived` for the sort state alongside the existing `$derived` declarations:

```ts
const sort = $derived(data.sort);
```

Replace the `<thead>` block (the seven `<th>` elements):

```svelte
<thead>
  <tr class="border-b text-left text-gray-500">
    <th class="py-2 pr-3 font-medium"><SortHeader label="ID"           field="id"          current={sort} /></th>
    <th class="py-2 pr-3 font-medium"><SortHeader label="Action"       field="action"      current={sort} /></th>
    <th class="py-2 pr-3 font-medium"><SortHeader label="Office"       field="office"      current={sort} /></th>
    <th class="py-2 pr-3 font-medium">Items</th>
    <th class="py-2 pr-3 font-medium"><SortHeader label="Performed by" field="performedBy" current={sort} /></th>
    <th class="py-2 pr-3 font-medium"><SortHeader label="Recorded by"  field="recordedBy"  current={sort} /></th>
    <th class="py-2 font-medium"><SortHeader label="Date"               field="date"        current={sort} /></th>
  </tr>
</thead>
```

(`Items` stays a plain `<th>` — multi-line composite cell, not sortable.)

- [ ] **Step 4: Verify the page compiles and tests pass**

```sh
npm run check && npm run test:unit -- --run src/lib/server/services/audit.test.ts
```

Expected: 0 type errors, audit tests still pass.

- [ ] **Step 5: Manual smoke check**

```sh
npm run dev
```

Open `http://localhost:5173/audit-log`. Click each sortable header (ID, Action, Office, Performed by, Recorded by, Date). Each click should re-sort the table; clicking the same header twice should flip the arrow direction.

- [ ] **Step 6: Commit**

```sh
git add src/routes/\(app\)/audit-log/+page.server.ts src/routes/\(app\)/audit-log/+page.svelte
git commit -m "Wired sortable headers into audit log"
```

---

## Task 5: Dashboard page wiring (per-office tables share one sort schema)

**Files:**

- Modify: `src/routes/(app)/dashboard/+page.svelte`

- [ ] **Step 1: Modify the script block**

In `src/routes/(app)/dashboard/+page.svelte`, add to the imports:

```ts
import { page } from '$app/state';
import SortHeader from '$lib/components/app/SortHeader.svelte';
import { parseSortParam, compareBy } from '$lib/utils/sort.js';
```

After the existing `$derived` declarations, add the sort state and a derived sorted-groups array:

```ts
const sort = $derived(parseSortParam(page.url));

type Item = (typeof officeGroups)[number]['items'][number];

function getter(field: string): (item: Item) => unknown {
  switch (field) {
    case 'product':       return (i) => i.productName;
    case 'qty':           return (i) => i.currentQty;
    case 'daysRemaining': return (i) => i.daysRemaining;
    case 'burnRate':      return (i) => i.dailyBurnRate;
    case 'updated':       return (i) => i.updatedAt;
    default:              return (i) => i.productName;
  }
}

const sortedGroups = $derived(
  sort
    ? officeGroups.map((g) => ({
        ...g,
        items: [...g.items].sort(compareBy(getter(sort.field), sort.dir)),
      }))
    : officeGroups,
);
```

- [ ] **Step 2: Replace the `<thead>` and `{#each officeGroups ...}` block**

Change the `{#each officeGroups as group ...}` to `{#each sortedGroups as group ...}`.

Replace the `<thead>` block:

```svelte
<thead>
  <tr class="border-b text-left text-gray-500">
    <th class="py-2 px-4 font-medium"><SortHeader label="Product"        field="product"       current={sort} /></th>
    <th class="py-2 px-4 font-medium text-right"><SortHeader label="Qty"            field="qty"           current={sort} align="right" /></th>
    <th class="py-2 px-4 font-medium text-right"><SortHeader label="Days remaining" field="daysRemaining" current={sort} align="right" /></th>
    <th class="py-2 px-4 font-medium text-right"><SortHeader label="Burn rate"      field="burnRate"      current={sort} align="right" /></th>
    <th class="py-2 px-4 font-medium text-right"><SortHeader label="Updated"        field="updated"       current={sort} align="right" /></th>
  </tr>
</thead>
```

- [ ] **Step 3: Verify the page compiles**

```sh
npm run check
```

Expected: 0 errors.

- [ ] **Step 4: Manual smoke check**

```sh
npm run dev
```

Open `http://localhost:5173/dashboard`. Click each header — *every* per-office group re-orders consistently. The URL updates to `?sort=qty&dir=desc` etc.

- [ ] **Step 5: Commit**

```sh
git add src/routes/\(app\)/dashboard/+page.svelte
git commit -m "Made dashboard inventory tables sortable"
```

---

## Task 6: Reports page wiring (two pivots, prefixed params)

**Files:**

- Modify: `src/routes/(app)/reports/+page.svelte`

- [ ] **Step 1: Modify the script block**

Add to the imports:

```ts
import { page } from '$app/state';
import SortHeader from '$lib/components/app/SortHeader.svelte';
import { parseSortParam, compareBy } from '$lib/utils/sort.js';
```

After the existing `$derived` declarations, add sort state for both pivots and derived sorted arrays:

```ts
const historySort = $derived(parseSortParam(page.url, 'history'));
const staffSort   = $derived(parseSortParam(page.url, 'staff'));

// Helper: total items across actions for one month row
function monthItemsTotal(month: string): number {
  return history.filter((r) => r.month === month).reduce((s, r) => s + r.totalItems, 0);
}

// Helper: items moved for one month/action cell
function monthActionItems(month: string, action: string): number {
  return historyCell(month, action)?.totalItems ?? 0;
}

const sortedMonths = $derived.by(() => {
  if (!historySort) return months;
  const dir = historySort.dir;
  if (historySort.field === 'month')  return [...months].sort(compareBy<string>((m) => m, dir));
  if (historySort.field === 'total')  return [...months].sort(compareBy<string>((m) => monthItemsTotal(m), dir));
  // Action column — sort by totalItems for that action
  return [...months].sort(compareBy<string>((m) => monthActionItems(m, historySort.field), dir));
});

// Default for staff: Total desc when no explicit sort
function staffTotal(userId: string): number {
  return staffActions.reduce((s, a) => s + staffCell(userId, a), 0);
}

const sortedStaffMembers = $derived.by(() => {
  const effective = staffSort ?? { field: 'total', dir: 'desc' as const };
  if (effective.field === 'staff') {
    return [...staffMembers].sort(compareBy<[string, string]>(([, name]) => name, effective.dir));
  }
  if (effective.field === 'total') {
    return [...staffMembers].sort(compareBy<[string, string]>(([id]) => staffTotal(id), effective.dir));
  }
  // Action column
  return [...staffMembers].sort(compareBy<[string, string]>(([id]) => staffCell(id, effective.field), effective.dir));
});
```

- [ ] **Step 2: Replace the Activity by Month `<thead>` and iteration**

Replace the History `<thead>`:

```svelte
<thead>
  <tr class="border-b text-left text-gray-500">
    <th class="py-2 pr-4 font-medium"><SortHeader label="Month" field="month" current={historySort} paramPrefix="history" /></th>
    {#each historyActions as action (action)}
      <th class="py-2 pr-4 font-medium text-right">
        <SortHeader label={ACTION_LABELS[action] ?? action} field={action} current={historySort} paramPrefix="history" align="right" />
      </th>
    {/each}
    <th class="py-2 font-medium text-right">
      <SortHeader label="Total items moved" field="total" current={historySort} paramPrefix="history" align="right" />
    </th>
  </tr>
</thead>
```

Change `{#each months as month ...}` to `{#each sortedMonths as month ...}`.

- [ ] **Step 3: Replace the Usage by Staff `<thead>` and iteration**

Replace the Staff `<thead>`:

```svelte
<thead>
  <tr class="border-b text-left text-gray-500">
    <th class="py-2 pr-4 font-medium"><SortHeader label="Staff member" field="staff" current={staffSort} paramPrefix="staff" /></th>
    {#each staffActions as action (action)}
      <th class="py-2 pr-4 font-medium text-right">
        <SortHeader label={ACTION_LABELS[action] ?? action} field={action} current={staffSort} paramPrefix="staff" align="right" />
      </th>
    {/each}
    <th class="py-2 font-medium text-right">
      <SortHeader label="Total" field="total" current={staffSort} paramPrefix="staff" align="right" />
    </th>
  </tr>
</thead>
```

Change `{#each staffMembers as [userId, userName] ...}` to `{#each sortedStaffMembers as [userId, userName] ...}`.

- [ ] **Step 4: Verify the page compiles**

```sh
npm run check
```

Expected: 0 errors.

- [ ] **Step 5: Manual smoke check**

```sh
npm run dev
```

Open `http://localhost:5173/reports`. Confirm:
- Month column sorts months chronologically asc/desc.
- Each action column on the History pivot sorts by items per month.
- Total column sorts by month-total items.
- Staff member column sorts alphabetically.
- Each staff action column sorts by transaction count for that staff member.
- Total on Staff pivot sorts staff by overall activity.
- The two pivots have independent URL params (`historySort` vs `staffSort`).

- [ ] **Step 6: Commit**

```sh
git add src/routes/\(app\)/reports/+page.svelte
git commit -m "Made reports pivot tables sortable"
```

---

## Task 7: Reconcile (pending) page wiring

**Files:**

- Modify: `src/routes/(app)/reconcile/+page.svelte`

- [ ] **Step 1: Read the current page**

```sh
cat src/routes/\(app\)/reconcile/+page.svelte
```

Note the data shape (`data.counts`) and the existing column order: Confirmation ID, Office, Submitted by, Date, action button.

- [ ] **Step 2: Modify the script block**

Add to imports:

```ts
import { page } from '$app/state';
import SortHeader from '$lib/components/app/SortHeader.svelte';
import { parseSortParam, compareBy } from '$lib/utils/sort.js';
```

After existing reactive declarations, add:

```ts
const sort = $derived(parseSortParam(page.url));

type Count = (typeof data.counts)[number];

function getter(field: string): (c: Count) => unknown {
  switch (field) {
    case 'confirmationId': return (c) => c.confirmationId;
    case 'office':         return (c) => c.officeNumber;
    case 'submittedBy':    return (c) => c.performedByName;
    case 'date':           return (c) => c.createdAt;
    default:               return (c) => c.createdAt;
  }
}

const sortedCounts = $derived(
  sort ? [...data.counts].sort(compareBy(getter(sort.field), sort.dir)) : data.counts,
);
```

(Field names confirmed against the page: `confirmationId`, `officeNumber`, `performedByName`, `createdAt`. The visible column label "Submitted by" maps to the underlying `performedByName`.)

- [ ] **Step 3: Replace `<thead>` and iteration**

Replace the four sortable `<th>` elements:

```svelte
<th class="py-2 pr-4 font-medium"><SortHeader label="Confirmation ID" field="confirmationId" current={sort} /></th>
<th class="py-2 pr-4 font-medium"><SortHeader label="Office"          field="office"         current={sort} /></th>
<th class="py-2 pr-4 font-medium"><SortHeader label="Submitted by"    field="submittedBy"    current={sort} /></th>
<th class="py-2 pr-4 font-medium"><SortHeader label="Date"            field="date"           current={sort} /></th>
<th class="py-2 font-medium"></th>
```

(Last column is the action button — no SortHeader.)

Change `{#each data.counts as count ...}` to `{#each sortedCounts as count ...}`.

- [ ] **Step 4: Verify and smoke check**

```sh
npm run check && npm run dev
```

Open `http://localhost:5173/reconcile`. Click each sortable header.

- [ ] **Step 5: Commit**

```sh
git add src/routes/\(app\)/reconcile/+page.svelte
git commit -m "Made pending counts table sortable"
```

---

## Task 8: Reconcile [id] page wiring

**Files:**

- Modify: `src/routes/(app)/reconcile/[id]/+page.svelte`

- [ ] **Step 1: Modify the script block**

Add to imports:

```ts
import { page } from '$app/state';
import SortHeader from '$lib/components/app/SortHeader.svelte';
import { parseSortParam, compareBy } from '$lib/utils/sort.js';
```

After existing reactive declarations, add:

```ts
const sort = $derived(parseSortParam(page.url));

type Row = (typeof comparison)[number];

function getter(field: string): (r: Row) => unknown {
  switch (field) {
    case 'product':       return (r) => r.productName;
    case 'physicalCount': return (r) => r.physicalQuantity;
    case 'systemStock':   return (r) => r.systemQuantity;
    case 'discrepancy':   return (r) => r.discrepancy;
    default:              return (r) => r.productName;
  }
}

const sortedComparison = $derived(
  sort ? [...comparison].sort(compareBy(getter(sort.field), sort.dir)) : comparison,
);
```

(Field names confirmed: `productName`, `physicalQuantity`, `systemQuantity`, and a precomputed `discrepancy`.)

- [ ] **Step 2: Replace `<thead>` and iteration**

Replace the four `<th>` elements:

```svelte
<th class="py-2 pr-4 font-medium"><SortHeader label="Product"                            field="product"       current={sort} /></th>
<th class="py-2 pr-4 font-medium text-right"><SortHeader label="Physical count" field="physicalCount" current={sort} align="right" /></th>
<th class="py-2 pr-4 font-medium text-right"><SortHeader label="System stock"   field="systemStock"   current={sort} align="right" /></th>
<th class="py-2 font-medium text-right"><SortHeader label="Discrepancy"          field="discrepancy"   current={sort} align="right" /></th>
```

Change `{#each comparison as row ...}` to `{#each sortedComparison as row ...}`.

- [ ] **Step 3: Verify and smoke check**

```sh
npm run check && npm run dev
```

Open a reconcile detail page (navigate from `/reconcile`). Click each header.

- [ ] **Step 4: Commit**

```sh
git add src/routes/\(app\)/reconcile/\[id\]/+page.svelte
git commit -m "Made reconcile comparison table sortable"
```

---

## Task 9: Admin/Offices page wiring

**Files:**

- Modify: `src/routes/(app)/admin/offices/+page.svelte`

- [ ] **Step 1: Modify the script block**

Add to imports:

```ts
import { page } from '$app/state';
import SortHeader from '$lib/components/app/SortHeader.svelte';
import { parseSortParam, compareBy } from '$lib/utils/sort.js';
```

Add at the top of the script (after existing declarations):

```ts
const sort = $derived(parseSortParam(page.url));

type Office = (typeof data.offices)[number];

function getter(field: string): (o: Office) => unknown {
  switch (field) {
    case 'number': return (o) => o.officeNumber;
    case 'name':   return (o) => o.name;
    case 'type':   return (o) => o.officeType;
    case 'team':   return (o) => o.teamName;
    case 'region': return (o) => o.regionName;
    case 'status': return (o) => o.isActive ? 1 : 0;
    default:       return (o) => o.officeNumber;
  }
}

const sortedOffices = $derived(
  sort ? [...data.offices].sort(compareBy(getter(sort.field), sort.dir)) : data.offices,
);
```

(Field names confirmed: `officeNumber`, `name`, `officeType` (nullable), `teamName`, `regionName`, `isActive`. Nulls on `officeType` sort last via `compareBy`.)

- [ ] **Step 2: Replace the six sortable `<th>` elements**

```svelte
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="#"      field="number" current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Name"   field="name"   current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Type"   field="type"   current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Team"   field="team"   current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Region" field="region" current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Status" field="status" current={sort} /></th>
<th class="px-3 py-2"></th>
```

Change `{#each data.offices as o ...}` to `{#each sortedOffices as o ...}`.

- [ ] **Step 3: Verify and smoke check**

```sh
npm run check && npm run dev
```

Open `http://localhost:5173/admin/offices`. Click each header.

- [ ] **Step 4: Commit**

```sh
git add src/routes/\(app\)/admin/offices/+page.svelte
git commit -m "Made admin offices table sortable"
```

---

## Task 10: Admin/Users page wiring

**Files:**

- Modify: `src/routes/(app)/admin/users/+page.svelte`

- [ ] **Step 1: Modify the script block**

Add to imports:

```ts
import { page } from '$app/state';
import SortHeader from '$lib/components/app/SortHeader.svelte';
import { parseSortParam, compareBy } from '$lib/utils/sort.js';
```

Add (after existing declarations):

```ts
const sort = $derived(parseSortParam(page.url));

type User = (typeof data.users)[number];

function getter(field: string): (u: User) => unknown {
  switch (field) {
    case 'name':   return (u) => u.name;
    case 'email':  return (u) => u.email;
    case 'role':   return (u) => u.role;
    case 'team':   return (u) => u.teamId ?? u.regionId ?? '';
    case 'active': return (u) => u.isActive ? 1 : 0;
    default:       return (u) => u.name;
  }
}

const sortedUsers = $derived(
  sort ? [...data.users].sort(compareBy(getter(sort.field), sort.dir)) : data.users,
);
```

(Field names confirmed: `name`, `email`, `role`, `teamId` and `regionId` (both nullable), `isActive`. The Team/Region column displays `u.teamId ?? u.regionId ?? '—'` so the sort key matches what's visible — sorting groups users by team/region ID. The visible IDs aren't human-friendly to sort by, but matching the displayed value avoids surprise; improving the column to show team/region name is out of scope.)

- [ ] **Step 2: Replace the five sortable `<th>` elements**

```svelte
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Name"          field="name"   current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Email"         field="email"  current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Role"          field="role"   current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Team / Region" field="team"   current={sort} /></th>
<th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Active"        field="active" current={sort} /></th>
<th class="px-3 py-2"></th>
```

Change `{#each data.users as u ...}` to `{#each sortedUsers as u ...}`.

- [ ] **Step 3: Verify and smoke check**

```sh
npm run check && npm run dev
```

Open `http://localhost:5173/admin/users`. Click each header.

- [ ] **Step 4: Commit**

```sh
git add src/routes/\(app\)/admin/users/+page.svelte
git commit -m "Made admin users table sortable"
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit-test suite**

```sh
npm run test:unit -- --run
```

Expected: all tests pass — no regressions in existing services or components.

- [ ] **Step 2: Run lint and type-check**

```sh
npm run check && npm run lint
```

Expected: 0 errors, 0 warnings introduced by this work.

- [ ] **Step 3: Manual click-through**

```sh
npm run dev
```

Walk through each page in turn, clicking every column header to confirm:
- Arrow indicator appears on the active column.
- Clicking the same header twice flips direction.
- Clicking a different header resets to asc.
- Reloading the page preserves the sort.
- Dashboard: every per-office group re-orders together.
- Reports: the two pivots sort independently.
- Audit Log: page param resets to 0 when sort changes; pagination still works post-sort.
