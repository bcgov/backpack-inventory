<script lang="ts">
  import { base } from '$app/paths';
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
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

  {#if order.status === 'pending' || order.status === 'partial'}
    <h2 class="font-semibold text-gray-800 mt-6 mb-2">Receive items</h2>
    {#if form?.success}
      <div class="mb-3 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">Items received.</div>
    {/if}
    {#if form?.error}
      <div class="mb-3 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{form.error}</div>
    {/if}
    <form method="POST" action="?/receive" enctype="multipart/form-data" class="border rounded p-3 space-y-3">
      {#each lineItems.filter((li) => li.remaining > 0) as li (li.id)}
        <div class="flex justify-between items-center">
          <span class="text-sm">{li.productName ?? li.otherDescription ?? 'Unknown'} <span class="text-gray-500">(remaining: {li.remaining})</span></span>
          <input type="number" min="0" name="rcv:{li.id}" value={li.remaining}
                 class="w-20 rounded border-gray-300 text-sm py-1 px-2 border text-right" />
        </div>
      {/each}
      <div>
        <label class="block text-xs text-gray-500 mb-1" for="rcv-notes">Notes</label>
        <textarea id="rcv-notes" name="notes" rows="2" class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white"></textarea>
      </div>
      <div>
        <label class="block text-xs text-gray-500 mb-1" for="rcv-receipt">Shipping receipt (optional)</label>
        <input id="rcv-receipt" name="shippingReceipt" type="file" class="text-sm" />
      </div>
      <button type="submit" class="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">
        Record receipt
      </button>
    </form>
  {/if}

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
