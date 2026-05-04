<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/state';
  import SortHeader from '$lib/components/app/SortHeader.svelte';
  import RecipientsEditor from '$lib/components/app/RecipientsEditor.svelte';
  import { parseSortParam, compareBy } from '$lib/utils/sort.js';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  const sort = $derived(parseSortParam(page.url));

  type Office = (typeof data.offices)[number];

  function getter(field: string): (o: Office) => unknown {
    switch (field) {
      case 'number': return (o) => o.officeNumber;
      case 'name':   return (o) => o.name;
      case 'type':   return (o) => o.officeType;
      case 'team':   return (o) => o.teamName;
      case 'region': return (o) => o.regionName;
      case 'status': return (o) => o.isActive ? 1 : 0;
      default:       return (o) => o.officeNumber;
    }
  }

  const sortedOffices = $derived(
    sort ? [...data.offices].sort(compareBy(getter(sort.field), sort.dir)) : data.offices,
  );
</script>

{#if form?.error}
  <div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{form.error}</div>
{/if}

<div class="overflow-x-auto">
  <table class="min-w-full text-sm">
    <thead class="bg-gray-50">
      <tr>
        <th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="#"      field="number" current={sort} /></th>
        <th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Name"   field="name"   current={sort} /></th>
        <th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Type"   field="type"   current={sort} /></th>
        <th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Team"   field="team"   current={sort} /></th>
        <th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Region" field="region" current={sort} /></th>
        <th class="text-left px-3 py-2 font-medium text-gray-600"><SortHeader label="Status" field="status" current={sort} /></th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Recipients</th>
        <th class="px-3 py-2"></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {#each sortedOffices as o (o.id)}
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
            <RecipientsEditor officeId={o.id} initialEmails={data.recipientsByOffice[o.id] ?? []} />
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
