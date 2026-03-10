<!-- src/routes/(app)/audit-log/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  const { rows, total, page, pageSize, filters, offices, users, actions } = data;
  const totalPages = Math.ceil(total / pageSize);

  const ACTION_LABELS: Record<string, string> = {
    receive:         'Receive',
    remove:          'Remove',
    return:          'Return',
    redistribute:    'Redistribute',
    inventory_count: 'Inventory Count',
  };

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' });
  }

  function pageUrl(p: number): string {
    const params = new URLSearchParams({
      ...(filters.officeId          ? { office:   filters.officeId }          : {}),
      ...(filters.action            ? { action:   filters.action }             : {}),
      ...(filters.performedByUserId ? { user:     filters.performedByUserId }  : {}),
      ...(filters.dateFrom          ? { dateFrom: filters.dateFrom }           : {}),
      ...(filters.dateTo            ? { dateTo:   filters.dateTo }             : {}),
      page: String(p),
    });
    return `?${params}`;
  }
</script>

<div class="max-w-6xl mx-auto">
  <h1 class="text-xl font-semibold mb-4">Audit Log</h1>

  <!-- Filter form (GET submission — no JS needed) -->
  <form method="GET" class="mb-6 flex flex-wrap gap-3 items-end bg-gray-50 border rounded p-4">
    <div>
      <label class="block text-xs text-gray-500 mb-1" for="office">Office</label>
      <select id="office" name="office"
              class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">
        <option value="">All offices</option>
        {#each offices as o (o.id)}
          <option value={o.id} selected={filters.officeId === o.id}>
            {o.officeNumber} – {o.name}
          </option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-500 mb-1" for="action">Action</label>
      <select id="action" name="action"
              class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">
        <option value="">All actions</option>
        {#each actions as a (a)}
          <option value={a} selected={filters.action === a}>{ACTION_LABELS[a] ?? a}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-xs text-gray-500 mb-1" for="user">Staff member</label>
      <select id="user" name="user"
              class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">
        <option value="">All staff</option>
        {#each users as u (u.id)}
          <option value={u.id} selected={filters.performedByUserId === u.id}>{u.name}</option>
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
        Filter
      </button>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href="/audit-log" class="py-1.5 px-3 border rounded text-sm text-gray-600 hover:bg-gray-100">
        Clear
      </a>
    </div>
  </form>

  <!-- Results count -->
  <p class="text-sm text-gray-500 mb-3">
    {total} transaction{total === 1 ? '' : 's'}
    {#if total > 0}
      — showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)}
    {/if}
  </p>

  <!-- Table -->
  {#if rows.length === 0}
    <p class="text-gray-400 text-sm">No transactions match the current filters.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b text-left text-gray-500">
            <th class="py-2 pr-3 font-medium">ID</th>
            <th class="py-2 pr-3 font-medium">Action</th>
            <th class="py-2 pr-3 font-medium">Office</th>
            <th class="py-2 pr-3 font-medium">Items</th>
            <th class="py-2 pr-3 font-medium">Performed by</th>
            <th class="py-2 pr-3 font-medium">Recorded by</th>
            <th class="py-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr class="border-b hover:bg-gray-50 align-top">
              <td class="py-2 pr-3 font-mono text-xs">{row.confirmationId}</td>
              <td class="py-2 pr-3">{ACTION_LABELS[row.action] ?? row.action}</td>
              <td class="py-2 pr-3 whitespace-nowrap">{row.officeNumber} – {row.officeName}</td>
              <td class="py-2 pr-3">
                {#each row.lineItems as li, i (i)}
                  <div>{li.productName}{li.otherDesc ? ` (${li.otherDesc})` : ''} × {li.quantity}</div>
                {/each}
              </td>
              <td class="py-2 pr-3">{row.performedByName}</td>
              <td class="py-2 pr-3">
                {row.performedByUserId === row.recordedByUserId ? '—' : row.recordedByName}
              </td>
              <td class="py-2 whitespace-nowrap text-gray-500">{formatDate(row.createdAt)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <div class="mt-4 flex gap-2 items-center text-sm">
        {#if page > 0}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={pageUrl(page - 1)} class="px-3 py-1 border rounded hover:bg-gray-100">Previous</a>
        {/if}
        <span class="text-gray-500">Page {page + 1} of {totalPages}</span>
        {#if page < totalPages - 1}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
          <a href={pageUrl(page + 1)} class="px-3 py-1 border rounded hover:bg-gray-100">Next</a>
        {/if}
      </div>
    {/if}
  {/if}
</div>
