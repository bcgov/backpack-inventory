<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#if form?.error}
  <div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{form.error}</div>
{/if}

<div class="overflow-x-auto">
  <table class="min-w-full text-sm">
    <thead class="bg-gray-50">
      <tr>
        <th class="text-left px-3 py-2 font-medium text-gray-600">#</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Name</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Type</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Team</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Region</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Status</th>
        <th class="px-3 py-2"></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {#each data.offices as o (o.id)}
        <tr class="hover:bg-gray-50 {o.isActive ? '' : 'opacity-50'}">
          <td class="px-3 py-2 text-gray-500">{o.officeNumber}</td>
          <td class="px-3 py-2 font-medium">{o.name}</td>
          <td class="px-3 py-2 text-gray-500">{o.officeType ?? '—'}</td>
          <td class="px-3 py-2 text-gray-500">{o.teamName}</td>
          <td class="px-3 py-2 text-gray-500">{o.regionName}</td>
          <td class="px-3 py-2">
            <span class="inline-block px-2 py-0.5 rounded text-xs
                         {o.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
              {o.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td class="px-3 py-2">
            <form method="POST" action="?/toggleOffice" use:enhance>
              <input type="hidden" name="officeId" value={o.id} />
              <input type="hidden" name="isActive" value={String(!o.isActive)} />
              <button type="submit"
                      class="text-xs px-2 py-1 rounded border
                             {o.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}">
                {o.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </form>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
