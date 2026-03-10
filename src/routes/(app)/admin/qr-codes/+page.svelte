<script lang="ts">
  import { base } from '$app/paths';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const activeProducts = $derived(data.products.filter((p) => (p as { isActive?: boolean }).isActive !== false));

  function productsForCategory(categoryId: string) {
    return activeProducts.filter((p) => p.categoryId === categoryId);
  }
</script>

<div>
  <div class="flex flex-wrap items-end gap-4 mb-6">
    <!-- Office selector (GET form — no JS needed) -->
    <form method="GET" class="flex items-end gap-2">
      <div>
        <label for="officeId" class="block text-sm font-medium text-gray-700 mb-1">Office</label>
        <select
          id="officeId"
          name="officeId"
          onchange={(e) => (e.currentTarget as HTMLSelectElement).form?.submit()}
          class="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          {#each data.offices as office (office.id)}
            <option value={office.id} selected={office.id === data.selectedOffice?.id}>
              {office.name}
            </option>
          {/each}
        </select>
      </div>
    </form>

    {#if data.selectedOffice}
      <button
        onclick={() => window.print()}
        class="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
      >
        Print sheet
      </button>
    {/if}
  </div>

  {#if !data.selectedOffice}
    <p class="text-gray-500 text-sm">No offices found in your scope.</p>

  {:else}
    <p class="text-sm text-gray-500 mb-4">
      Scan these codes with a mobile device to record transactions for
      <strong>{data.selectedOffice.name}</strong>.
    </p>

    {#each data.categories as category (category.id)}
      {@const products = productsForCategory(category.id)}
      {#if products.length > 0}
        <section class="mb-8 print:break-inside-avoid-page">
          <h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b pb-1">
            {category.name}
          </h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4">
            {#each products as product (product.id)}
              <div class="border border-gray-200 rounded-lg p-3 text-center print:break-inside-avoid">
                <img
                  src="{base}/api/qr/{data.selectedOffice.id}/{product.id}"
                  alt="QR code — {product.name} at {data.selectedOffice.name}"
                  class="w-28 h-28 mx-auto"
                  loading="lazy"
                />
                <p class="text-xs font-medium text-gray-800 mt-2 leading-tight">{product.name}</p>
                <p class="text-[10px] text-gray-400 mt-0.5">{data.selectedOffice.name}</p>
              </div>
            {/each}
          </div>
        </section>
      {/if}
    {/each}
  {/if}
</div>

<style>
  @media print {
    /* Hide browser chrome elements when printing */
    nav, aside { display: none !important; }
    main { margin-left: 0 !important; }
  }
</style>
