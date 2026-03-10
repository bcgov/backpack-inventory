<!-- src/routes/(app)/reports/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  const ACTION_LABELS: Record<string, string> = {
    receive:         'Receive',
    remove:          'Remove',
    return:          'Return',
    redistribute:    'Redistribute',
    inventory_count: 'Inventory Count',
  };

  const offices = data.offices;
  const filters = data.filters;

  // Pivot history rows: unique months as rows, actions as columns
  type HistoryRow = { month: string; action: string; txnCount: number; totalItems: number };
  const history = data.history as HistoryRow[];
  const months: string[] = [...new Set(history.map(r => r.month))].sort().reverse();
  const historyActions: string[] = [...new Set(history.map(r => r.action))].sort();

  function historyCell(month: string, action: string): HistoryRow | null {
    return history.find(r => r.month === month && r.action === action) ?? null;
  }

  // Pivot staff rows: unique staff as rows, actions as columns
  type StaffRow = { userId: string; userName: string; action: string; txnCount: number };
  const staffUsage = data.staffUsage as StaffRow[];
  const staffMembers: [string, string][] = [...new Map(staffUsage.map(r => [r.userId, r.userName] as [string, string])).entries()];
  const staffActions: string[]  = [...new Set(staffUsage.map(r => r.action))].sort();

  function staffCell(userId: string, action: string): number {
    return staffUsage.find(r => r.userId === userId && r.action === action)?.txnCount ?? 0;
  }
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
              <th class="py-2 pr-4 font-medium">Month</th>
              {#each historyActions as action (action)}
                <th class="py-2 pr-4 font-medium text-right">{ACTION_LABELS[action] ?? action}</th>
              {/each}
              <th class="py-2 font-medium text-right">Total items moved</th>
            </tr>
          </thead>
          <tbody>
            {#each months as month (month)}
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
              <th class="py-2 pr-4 font-medium">Staff member</th>
              {#each staffActions as action (action)}
                <th class="py-2 pr-4 font-medium text-right">{ACTION_LABELS[action] ?? action}</th>
              {/each}
              <th class="py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {#each staffMembers as [userId, userName] (userId)}
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
