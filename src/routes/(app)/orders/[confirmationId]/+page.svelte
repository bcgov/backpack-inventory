<script lang="ts">
  import { base } from '$app/paths';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const order      = $derived(data.detail.order);
  const lineItems  = $derived(data.detail.lineItems);
  const events     = $derived(data.detail.receiveEvents);
  const STATUS_BADGE: Record<string, string> = {
    pending:   'bg-amber-100  text-amber-800',
    partial:   'bg-blue-100   text-blue-800',
    received:  'bg-green-100  text-green-800',
    cancelled: 'bg-gray-100   text-gray-500',
  };
</script>

<div class="max-w-3xl mx-auto">
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
  <a href="{base}/orders" class="text-sm text-blue-600 hover:underline mb-2 inline-block">← Back to orders</a>

  <h1 class="text-xl font-semibold">Order {order.confirmationId}</h1>
  <p class="text-sm text-gray-500 mt-1">
    {order.officeNumber} – {order.officeName} ·
    Created by {order.createdByName} on {new Date(order.createdAt).toLocaleString('en-CA')}
  </p>
  <span class="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded {STATUS_BADGE[order.status]}">
    {order.status.toUpperCase()}
  </span>

  {#if order.notes}
    <p class="mt-4 text-sm text-gray-700"><span class="text-gray-500">Notes:</span> {order.notes}</p>
  {/if}

  <h2 class="font-semibold text-gray-800 mt-6 mb-2">Items</h2>
  <div class="overflow-x-auto border rounded">
    <table class="w-full text-sm">
      <thead class="bg-gray-50">
        <tr class="border-b text-left text-gray-500">
          <th class="py-2 px-3 font-medium">Product</th>
          <th class="py-2 px-3 font-medium text-right">Ordered</th>
          <th class="py-2 px-3 font-medium text-right">Received</th>
          <th class="py-2 px-3 font-medium text-right">Remaining</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        {#each lineItems as li (li.id)}
          <tr>
            <td class="py-2 px-3">{li.productName ?? li.otherDescription ?? 'Unknown'}</td>
            <td class="py-2 px-3 text-right">{li.quantityOrdered}</td>
            <td class="py-2 px-3 text-right">{li.quantityReceived}</td>
            <td class="py-2 px-3 text-right {li.remaining === 0 ? 'text-gray-400' : ''}">{li.remaining}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if order.status === 'cancelled'}
    <div class="mt-6 border rounded p-4 bg-gray-50">
      <h2 class="font-semibold text-gray-800 mb-2">Cancellation</h2>
      <p class="text-xs text-gray-500 mb-2">
        Cancelled by {order.cancelledByName} on {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString('en-CA') : '—'}
      </p>
      <pre class="text-sm text-gray-700 whitespace-pre-wrap">{order.cancellationMessage}</pre>
    </div>
  {/if}

  {#if events.length > 0}
    <h2 class="font-semibold text-gray-800 mt-6 mb-2">Receive history</h2>
    <ul class="text-sm divide-y divide-gray-100 border rounded">
      {#each events as e (e.id)}
        <li class="py-2 px-3 flex justify-between">
          <span>{new Date(e.receivedAt).toLocaleString('en-CA')} — {e.receivedByName}</span>
          <span class="text-gray-500 text-xs font-mono">tx {e.transactionId.slice(0, 8)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
