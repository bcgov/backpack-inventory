<script lang="ts">
  import type { Snippet } from 'svelte';
  import { base } from '$app/paths';
  let { children }: { children: Snippet } = $props();

  const tabs = [
    { href: `${base}/admin/users`,     label: 'Users' },
    { href: `${base}/admin/products`,  label: 'Products' },
    { href: `${base}/admin/offices`,   label: 'Offices' },
    { href: `${base}/admin/qr-codes`,  label: 'QR Codes' },
  ];
</script>

<div>
  <h1 class="text-xl font-semibold mb-4">Admin</h1>
  <nav class="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
    {#each tabs as tab (tab.href)}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={tab.href}
         class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 -mb-px">
        {tab.label}
      </a>
    {/each}
  </nav>
  {@render children()}
</div>
