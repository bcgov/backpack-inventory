<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-CA');
  }
</script>

<div class="max-w-4xl mx-auto">
  <h1 class="text-xl font-semibold mb-6">Pending Inventory Counts</h1>

  {#if data.counts.length === 0}
    <p class="text-gray-500 text-sm">No pending inventory counts in your scope.</p>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-b text-left text-gray-500">
            <th class="py-2 pr-4 font-medium">Confirmation ID</th>
            <th class="py-2 pr-4 font-medium">Office</th>
            <th class="py-2 pr-4 font-medium">Submitted by</th>
            <th class="py-2 pr-4 font-medium">Date</th>
            <th class="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {#each data.counts as count (count.transactionId)}
            <tr class="border-b hover:bg-gray-50">
              <td class="py-2 pr-4 font-mono">{count.confirmationId}</td>
              <td class="py-2 pr-4">{count.officeNumber} – {count.officeName}</td>
              <td class="py-2 pr-4">{count.performedByName}</td>
              <td class="py-2 pr-4">{formatDate(count.createdAt)}</td>
              <td class="py-2">
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                <a href="/reconcile/{count.transactionId}"
                   class="text-blue-600 hover:underline text-sm">Review</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
