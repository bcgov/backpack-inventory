<!-- src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import type { ForecastColor } from '$lib/types.js';

  let { data }: { data: PageData } = $props();
  const { officeGroups, offices, selectedOffice, config } = data;

  /** Tailwind classes for each colour state */
  const colorClasses: Record<ForecastColor, { badge: string; row: string; text: string }> = {
    green:  { badge: 'bg-green-100 text-green-800',   row: '',              text: '' },
    yellow: { badge: 'bg-yellow-100 text-yellow-800', row: 'bg-yellow-50',  text: 'text-yellow-700 font-semibold' },
    red:    { badge: 'bg-red-100 text-red-800',       row: 'bg-red-50',     text: 'text-red-700 font-semibold' },
    none:   { badge: '',                              row: '',              text: '' },
  };

  function formatDays(days: number | null): string {
    if (days === null) return '—';
    if (days === 0)    return '0 d';
    return `${days} d`;
  }

  function formatRate(rate: number | null): string {
    if (rate === null || rate <= 0) return '—';
    return `${rate.toFixed(1)}/day`;
  }
</script>

<div class="max-w-5xl mx-auto">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
    <h1 class="text-xl font-semibold">Current Inventory</h1>

    <!-- Office filter -->
    <form method="GET" class="flex gap-2 items-center">
      <select name="office"
              onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.submit()}
              class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">
        <option value="">All offices in scope</option>
        {#each offices as o (o.id)}
          <option value={o.id} selected={selectedOffice === o.id}>
            {o.officeNumber} – {o.name}
          </option>
        {/each}
      </select>
    </form>
  </div>

  <!-- Colour key -->
  <div class="flex gap-4 mb-4 text-xs text-gray-500">
    <span class="flex items-center gap-1">
      <span class="inline-block w-3 h-3 rounded-full bg-green-400"></span>
      &gt;{config.greenDays} days
    </span>
    <span class="flex items-center gap-1">
      <span class="inline-block w-3 h-3 rounded-full bg-yellow-400"></span>
      {config.yellowDays}–{config.greenDays} days
    </span>
    <span class="flex items-center gap-1">
      <span class="inline-block w-3 h-3 rounded-full bg-red-400"></span>
      &lt;{config.yellowDays} days
    </span>
    <span class="flex items-center gap-1">
      <span class="inline-block w-3 h-3 rounded-full bg-gray-200"></span>
      No burn data
    </span>
  </div>

  {#if officeGroups.length === 0}
    <p class="text-gray-400 text-sm">No inventory data yet. Record some transactions to get started.</p>
  {:else}
    <div class="space-y-6">
      {#each officeGroups as group (group.officeId)}
        <div class="border rounded overflow-hidden">
          <div class="bg-gray-50 px-4 py-2 border-b">
            <h2 class="font-medium text-sm">{group.officeNumber} — {group.officeName}</h2>
          </div>
          <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[480px]">
            <thead>
              <tr class="border-b text-left text-gray-500">
                <th class="py-2 px-4 font-medium">Product</th>
                <th class="py-2 px-4 font-medium text-right">Qty</th>
                <th class="py-2 px-4 font-medium text-right">Days remaining</th>
                <th class="py-2 px-4 font-medium text-right">Burn rate</th>
                <th class="py-2 px-4 font-medium text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {#each group.items as item (item.productId)}
                {@const cls = colorClasses[item.color]}
                <tr class="border-b last:border-0 hover:bg-gray-50 {cls.row}">
                  <td class="py-2 px-4">{item.productName}</td>

                  <td class="py-2 px-4 text-right font-mono">{item.currentQty}</td>

                  <!-- Days remaining + colour badge -->
                  <td class="py-2 px-4 text-right">
                    {#if item.color !== 'none'}
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium {cls.badge}">
                        {formatDays(item.daysRemaining)}
                      </span>
                    {:else}
                      <span class="text-gray-400 text-xs">{formatDays(item.daysRemaining)}</span>
                    {/if}
                    {#if item.burnRateSource === 'global'}
                      <span class="ml-1 text-xs text-gray-400" title="Using global product average">~</span>
                    {/if}
                  </td>

                  <!-- Burn rate (tooltip shows source) -->
                  <td class="py-2 px-4 text-right text-gray-400 text-xs"
                      title="Source: {item.burnRateSource}">
                    {formatRate(item.dailyBurnRate)}
                  </td>

                  <td class="py-2 px-4 text-right text-gray-400 text-xs">
                    {new Date(item.updatedAt).toLocaleDateString('en-CA')}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
