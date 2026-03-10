<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const count      = $derived(data.detail.count);
  const comparison = $derived(data.detail.comparison);
  const isPending  = $derived(count.status === 'pending');

  function discrepancyClass(d: number): string {
    if (d === 0) return 'text-gray-500';
    return d > 0 ? 'text-amber-600 font-medium' : 'text-red-600 font-medium';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-CA');
  }

  const REASON_CODES = [
    { value: 'RECOUNT',    label: 'Recount verified' },
    { value: 'DATA_ENTRY', label: 'Data entry error' },
    { value: 'THEFT',      label: 'Theft / loss' },
    { value: 'DAMAGE',     label: 'Damage / disposal' },
    { value: 'OTHER',      label: 'Other' },
  ];
</script>

<div class="max-w-3xl mx-auto">
  <!-- Header -->
  <div class="mb-6">
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a href="/reconcile" class="text-sm text-blue-600 hover:underline mb-2 inline-block">
      ← Back to pending counts
    </a>
    <h1 class="text-xl font-semibold">Inventory Count — {count.confirmationId}</h1>
    <p class="text-sm text-gray-500 mt-1">
      {count.officeNumber} – {count.officeName} &middot;
      Submitted by {count.performedByName} on {formatDate(count.createdAt)}
    </p>
    <span class="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded
      {count.status === 'pending'   ? 'bg-amber-100 text-amber-800' :
       count.status === 'accepted'  ? 'bg-green-100 text-green-800' :
                                      'bg-red-100 text-red-800'}">
      {count.status.toUpperCase()}
    </span>
  </div>

  {#if form?.success}
    <div class="mb-6 rounded bg-green-50 border border-green-200 p-4 text-green-800">
      Count {form.decision === 'accept' ? 'accepted' : 'rejected'} successfully.
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-6 rounded bg-red-50 border border-red-200 p-4 text-red-800">{form.error}</div>
  {/if}

  <!-- Comparison table -->
  <div class="mb-8 overflow-x-auto">
    <table class="w-full text-sm border-collapse">
      <thead>
        <tr class="border-b text-left text-gray-500">
          <th class="py-2 pr-4 font-medium">Product</th>
          <th class="py-2 pr-4 font-medium text-right">Physical count</th>
          <th class="py-2 pr-4 font-medium text-right">System stock</th>
          <th class="py-2 font-medium text-right">Discrepancy</th>
        </tr>
      </thead>
      <tbody>
        {#each comparison as row (row.productId)}
          <tr class="border-b hover:bg-gray-50">
            <td class="py-2 pr-4">
              <span class="text-gray-400 text-xs mr-1">{row.categoryName}</span>
              {row.productName}
            </td>
            <td class="py-2 pr-4 text-right">{row.physicalQuantity}</td>
            <td class="py-2 pr-4 text-right">{row.systemQuantity}</td>
            <td class="py-2 text-right {discrepancyClass(row.discrepancy)}">
              {row.discrepancy > 0 ? '+' : ''}{row.discrepancy}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    {#if comparison.length === 0}
      <p class="text-sm text-gray-400 mt-2">No items recorded in this count.</p>
    {/if}
  </div>

  <!-- Reconcile form (only shown for pending counts) -->
  {#if isPending}
    <form method="POST" use:enhance class="border rounded p-4 space-y-4 bg-gray-50">
      <h2 class="font-medium text-gray-800">Record decision</h2>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="reasonCode">
          Reason code <span class="font-normal text-gray-500">(optional)</span>
        </label>
        <select id="reasonCode" name="reasonCode"
                class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white">
          <option value="">— select reason —</option>
          {#each REASON_CODES as rc (rc.value)}
            <option value={rc.value}>{rc.label}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="notes">
          Notes <span class="font-normal text-gray-500">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows="2"
                  class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white"></textarea>
      </div>

      <div class="flex gap-3">
        <button type="submit" name="decision" value="accept"
                class="flex-1 py-2 px-4 bg-green-600 text-white rounded font-medium hover:bg-green-700 text-sm">
          Accept count — update inventory
        </button>
        <button type="submit" name="decision" value="reject"
                class="flex-1 py-2 px-4 bg-red-600 text-white rounded font-medium hover:bg-red-700 text-sm">
          Reject — no change
        </button>
      </div>
    </form>
  {/if}
</div>
