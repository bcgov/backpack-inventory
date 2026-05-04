<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import SortHeader from '$lib/components/app/SortHeader.svelte';
  import { parseSortParam, compareBy } from '$lib/utils/sort.js';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  const STATUSES = [
    { key: null,         label: 'All',       count: data.orders.length },
    { key: 'pending',    label: 'Pending'    },
    { key: 'partial',    label: 'Partial'    },
    { key: 'received',   label: 'Received'   },
    { key: 'cancelled',  label: 'Cancelled'  },
  ] as const;

  const sort = $derived(parseSortParam(page.url));
  type Row = (typeof data.orders)[number];
  function getter(field: string): (r: Row) => unknown {
    switch (field) {
      case 'confirmationId': return (r) => r.confirmationId;
      case 'office':         return (r) => r.officeNumber;
      case 'status':         return (r) => r.status;
      case 'items':          return (r) => r.lineItemCount;
      case 'createdBy':      return (r) => r.createdByName;
      case 'createdAt':      return (r) => r.createdAt;
      default:               return (r) => r.createdAt;
    }
  }
  const sortedOrders = $derived(sort ? [...data.orders].sort(compareBy(getter(sort.field), sort.dir)) : data.orders);

  function statusHref(status: string | null): string {
    const u = new URL(page.url.href);
    if (status) u.searchParams.set('status', status); else u.searchParams.delete('status');
    return u.pathname + u.search;
  }

  const STATUS_BADGE: Record<string, string> = {
    pending:   'bg-amber-100  text-amber-800',
    partial:   'bg-blue-100   text-blue-800',
    received:  'bg-green-100  text-green-800',
    cancelled: 'bg-gray-100   text-gray-500',
  };
</script>

<div class="max-w-5xl mx-auto">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-xl font-semibold">Orders</h1>
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a href="{base}/orders/new" class="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+ New order</a>
  </div>

  <!-- Status chips -->
  <div class="flex gap-2 mb-4 text-sm">
    {#each STATUSES as s (s.key ?? 'all')}
      {@const active = (data.filters.status === s.key)}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={statusHref(s.key)}
         class="px-3 py-1 rounded border {active ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">
        {s.label}
      </a>
    {/each}
  </div>

  {#if data.orders.length === 0}
    <p class="text-gray-400 text-sm">No orders match the current filter.</p>
  {:else}
    <div class="overflow-x-auto border rounded">
      <table class="w-full text-sm">
        <thead class="bg-gray-50">
          <tr class="border-b text-left text-gray-500">
            <th class="py-2 px-3 font-medium"><SortHeader label="Confirmation" field="confirmationId" current={sort} /></th>
            <th class="py-2 px-3 font-medium"><SortHeader label="Office"       field="office"         current={sort} /></th>
            <th class="py-2 px-3 font-medium"><SortHeader label="Status"       field="status"         current={sort} /></th>
            <th class="py-2 px-3 font-medium text-right"><SortHeader label="Items" field="items"      current={sort} align="right" /></th>
            <th class="py-2 px-3 font-medium"><SortHeader label="Created by"   field="createdBy"      current={sort} /></th>
            <th class="py-2 px-3 font-medium"><SortHeader label="Created at"   field="createdAt"      current={sort} /></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          {#each sortedOrders as o (o.id)}
            <tr class="hover:bg-gray-50">
              <td class="py-2 px-3 font-mono text-xs">
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                <a href="{base}/orders/{o.confirmationId}" class="text-blue-600 hover:underline">{o.confirmationId}</a>
              </td>
              <td class="py-2 px-3">{o.officeNumber} – {o.officeName}</td>
              <td class="py-2 px-3">
                <span class="inline-block px-2 py-0.5 rounded text-xs {STATUS_BADGE[o.status]}">{o.status}</span>
              </td>
              <td class="py-2 px-3 text-right">{o.lineItemCount}</td>
              <td class="py-2 px-3 text-gray-500">{o.createdByName}</td>
              <td class="py-2 px-3 text-gray-500">{new Date(o.createdAt).toLocaleString('en-CA')}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
