<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#if form?.error}
  <div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{form.error}</div>
{/if}
{#if form?.success}
  <div class="mb-4 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">User updated.</div>
{/if}

<div class="overflow-x-auto">
  <table class="min-w-full text-sm">
    <thead class="bg-gray-50">
      <tr>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Name</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Email</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Role</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Team / Region</th>
        <th class="text-left px-3 py-2 font-medium text-gray-600">Active</th>
        <th class="px-3 py-2"></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {#each data.users as u (u.id)}
        <tr class="hover:bg-gray-50">
          <td class="px-3 py-2">{u.name}</td>
          <td class="px-3 py-2 text-gray-500">{u.email}</td>
          <td class="px-3 py-2">
            <form method="POST" action="?/updateUser" use:enhance class="flex flex-wrap gap-2 items-center">
              <input type="hidden" name="userId" value={u.id} />

              <select name="role" value={u.role}
                      class="rounded border-gray-300 text-xs py-1 px-2 border">
                {#each data.roles as r (r)}
                  <option value={r} selected={u.role === r}>{r}</option>
                {/each}
              </select>

              <!-- Team selector (team-scoped roles) -->
              <select name="teamId"
                      class="rounded border-gray-300 text-xs py-1 px-2 border">
                <option value="">— no team —</option>
                {#each data.teams as t (t.id)}
                  <option value={t.id} selected={u.teamId === t.id}>{t.name}</option>
                {/each}
              </select>

              <!-- Region selector (region-scoped roles) -->
              <select name="regionId"
                      class="rounded border-gray-300 text-xs py-1 px-2 border">
                <option value="">— no region —</option>
                {#each data.regions as r (r.id)}
                  <option value={r.id} selected={u.regionId === r.id}>{r.name}</option>
                {/each}
              </select>

              <select name="isActive"
                      class="rounded border-gray-300 text-xs py-1 px-2 border">
                <option value="true"  selected={u.isActive}>Active</option>
                <option value="false" selected={!u.isActive}>Inactive</option>
              </select>

              <button type="submit"
                      class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                Save
              </button>
            </form>
          </td>
          <td class="px-3 py-2 text-gray-400 text-xs">
            {u.teamId ?? u.regionId ?? '—'}
          </td>
          <td class="px-3 py-2">
            <span class="inline-block px-2 py-0.5 rounded text-xs {u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
              {u.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td></td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
