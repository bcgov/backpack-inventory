<!-- src/routes/(app)/reports/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { page } from '$app/state';
  import SortHeader from '$lib/components/app/SortHeader.svelte';
  import { parseSortParam, compareBy } from '$lib/utils/sort.js';
  let { data }: { data: PageData } = $props();

  const ACTION_LABELS: Record<string, string> = {
    receive:         'Receive',
    remove:          'Remove',
    return:          'Return',
    redistribute:    'Redistribute',
    inventory_count: 'Inventory Count',
  };

  // $derived keeps these reactive when data changes (e.g. after filter navigation)
  const offices = $derived(data.offices);
  const filters = $derived(data.filters);

  // Pivot history rows: unique months as rows, actions as columns
  type HistoryRow = { month: string; action: string; txnCount: number; totalItems: number };
  const history = $derived(data.history as HistoryRow[]);
  const months = $derived([...new Set(history.map(r => r.month))].sort().reverse());
  const historyActions = $derived([...new Set(history.map(r => r.action))].sort());

  function historyCell(month: string, action: string): HistoryRow | null {
    return history.find(r => r.month === month && r.action === action) ?? null;
  }

  // Pivot staff rows: unique staff as rows, actions as columns
  type StaffRow = { userId: string; userName: string; action: string; txnCount: number };
  const staffUsage = $derived(data.staffUsage as StaffRow[]);
  const staffMembers = $derived([...new Map(staffUsage.map(r => [r.userId, r.userName] as [string, string])).entries()]);
  const staffActions = $derived([...new Set(staffUsage.map(r => r.action))].sort());

  function staffCell(userId: string, action: string): number {
    return staffUsage.find(r => r.userId === userId && r.action === action)?.txnCount ?? 0;
  }

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
</script>

<div class="max-w-5xl mx-auto space-y-10">
  <h1 class="text-xl font-semibold">Reports</h1>

  <!-- Filters -->
  <form method="GET" class="flex flex-wrap gap-3 items-end bg-gray-50 border rounded p-4">
    <div>
      <label class="block text-xs text-gray-500 mb-1" for="office">Office</label>
      <select id="office" name="office"
              class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">
        <option value="">All offices</option>
        {#each offices as o (o.id)}
          <option value={o.id} selected={filters.officeId === o.id}>{o.officeNumber} – {o.name}</option>
        {/each}
      </select>
    </div>
    <div>
      <label class="block text-xs text-gray-500 mb-1" for="dateFrom">From</label>
      <input id="dateFrom" name="dateFrom" type="date" value={filters.dateFrom ?? ''}
             class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white" />
    </div>
    <div>
      <label class="block text-xs text-gray-500 mb-1" for="dateTo">To</label>
      <input id="dateTo" name="dateTo" type="date" value={filters.dateTo ?? ''}
             class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white" />
    </div>
    <div class="flex gap-2">
      <button type="submit"
              class="py-1.5 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
        Apply
      </button>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href="/reports" class="py-1.5 px-3 border rounded text-sm text-gray-600 hover:bg-gray-100">
        Clear
      </a>
    </div>
  </form>

  <!-- UC-13: Transaction History by Month -->
  <section>
    <h2 class="font-semibold text-gray-800 mb-3">Transaction Activity by Month</h2>
    {#if months.length === 0}
      <p class="text-gray-400 text-sm">No transaction data for the selected period.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
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
          <tbody>
            {#each sortedMonths as month (month)}
              <tr class="border-b hover:bg-gray-50">
                <td class="py-2 pr-4 font-medium">{month}</td>
                {#each historyActions as action (action)}
                  {@const cell = historyCell(month, action)}
                  <td class="py-2 pr-4 text-right text-gray-600">
                    {#if cell}
                      {cell.txnCount} txn{cell.txnCount === 1 ? '' : 's'}
                      <span class="text-gray-400">/ {cell.totalItems} items</span>
                    {:else}
                      <span class="text-gray-300">—</span>
                    {/if}
                  </td>
                {/each}
                <td class="py-2 text-right font-medium">
                  {history.filter(r => r.month === month).reduce((sum, r) => sum + r.totalItems, 0)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>

  <!-- UC-14: Usage by Staff -->
  <section>
    <h2 class="font-semibold text-gray-800 mb-3">System Usage by Staff</h2>
    {#if staffMembers.length === 0}
      <p class="text-gray-400 text-sm">No staff activity recorded yet.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
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
          <tbody>
            {#each sortedStaffMembers as [userId, userName] (userId)}
              {@const total = staffActions.reduce((sum, a) => sum + staffCell(userId, a), 0)}
              <tr class="border-b hover:bg-gray-50">
                <td class="py-2 pr-4">{userName}</td>
                {#each staffActions as action (action)}
                  {@const n = staffCell(userId, action)}
                  <td class="py-2 pr-4 text-right {n === 0 ? 'text-gray-300' : ''}">
                    {n === 0 ? '—' : n}
                  </td>
                {/each}
                <td class="py-2 text-right font-medium">{total}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </section>
</div>
