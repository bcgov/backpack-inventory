<script lang="ts">
  import type { Snippet } from 'svelte';
  import { base } from '$app/paths';
  import { hasPermission } from '$lib/types.js';
  import type { LayoutData } from './$types';

  let { data, children }: { data: LayoutData; children: Snippet } = $props();

  let mobileOpen = $state(false);

  const navLinks = [
    { href: `${base}/dashboard`,                 label: 'Dashboard' },
    // Quick Scan removed — workers arrive via QR code URL directly
    { href: `${base}/transactions/add`,          label: 'Receive Order' },
    { href: `${base}/transactions/return`,       label: 'Return Items' },
    { href: `${base}/transactions/remove`,       label: 'Remove Items' },
    { href: `${base}/transactions/redistribute`, label: 'Redistribute' },
    { href: `${base}/inventory-count`,           label: 'Inventory Count' },
    { href: `${base}/reconcile`,                 label: 'Reconcile' },
    { href: `${base}/audit-log`,                 label: 'Audit Log' },
    { href: `${base}/reports`,                   label: 'Reports' },
  ];

  const canAdmin = $derived(hasPermission(data.user.role, 'manage_users'));
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Top bar -->
  <nav class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
    <div class="flex items-center gap-3">
      <!-- Hamburger (mobile only) -->
      <button
        class="md:hidden p-1 rounded text-gray-600 hover:bg-gray-100"
        onclick={() => mobileOpen = !mobileOpen}
        aria-label="Toggle menu"
      >
        {#if mobileOpen}
          <!-- X icon -->
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        {:else}
          <!-- Hamburger icon -->
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        {/if}
      </button>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href="{base}/dashboard" class="font-semibold text-gray-900">CISB Inventory</a>
    </div>
    <div class="flex items-center gap-4 text-sm">
      <span class="text-gray-500 hidden sm:inline">{data.user.name}</span>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href="{base}/auth/signout" class="text-red-600 hover:underline">Sign out</a>
    </div>
  </nav>

  <!-- Mobile overlay -->
  {#if mobileOpen}
    <div
      class="fixed inset-0 z-20 bg-black/40 md:hidden"
      role="presentation"
      onclick={() => mobileOpen = false}
    ></div>
  {/if}

  <!-- Sidebar (desktop: fixed; mobile: slide-in drawer) -->
  <aside class="
    fixed top-14 bottom-0 left-0 z-20 w-56 bg-white border-r border-gray-200 p-3
    flex flex-col gap-1 overflow-y-auto
    transition-transform duration-200
    {mobileOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0
  ">
    {#each navLinks as link (link.href)}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={link.href}
         class="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100"
         onclick={() => mobileOpen = false}>
        {link.label}
      </a>
    {/each}

    {#if canAdmin}
      <div class="mt-2 pt-2 border-t border-gray-100">
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a href="{base}/admin/users"
           class="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100 block"
           onclick={() => mobileOpen = false}>
          Admin
        </a>
      </div>
    {/if}
  </aside>

  <!-- Main content — offset by sidebar on md+ -->
  <main class="md:ml-56 p-4 min-h-screen">
    {@render children()}
  </main>
</div>
