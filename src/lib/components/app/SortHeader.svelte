<!-- src/lib/components/app/SortHeader.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { buildSortHref, type SortState } from '$lib/utils/sort.js';

  let {
    label,
    field,
    current = null,
    paramPrefix = '',
    align = 'left',
    class: cls = '',
  }: {
    label: string;
    field: string;
    current?: SortState | null;
    paramPrefix?: string;
    align?: 'left' | 'right';
    class?: string;
  } = $props();

  const isActive = $derived(current?.field === field);
  const arrow    = $derived(isActive ? (current!.dir === 'asc' ? '▲' : '▼') : '');

  async function onClick() {
    const href = buildSortHref(page.url, field, current ?? null, paramPrefix);
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    await goto(href, { keepFocus: true, noScroll: true, replaceState: true });
  }
</script>

<button
  type="button"
  onclick={onClick}
  class="inline-flex items-center gap-1 hover:text-gray-700 cursor-pointer {align === 'right' ? 'flex-row-reverse w-full justify-start' : ''} {cls}"
>
  <span>{label}</span>
  {#if arrow}
    <span class="text-xs text-gray-400">{arrow}</span>
  {:else}
    <span class="text-xs text-transparent">▲</span>
  {/if}
</button>
