<!-- src/routes/(app)/inventory-count/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type Product = { id: string; name: string; categoryId: string; isOther: boolean };

  function productsForCategory(catId: string): Product[] {
    return data.products.filter((p: Product) => p.categoryId === catId);
  }
</script>

<div class="max-w-2xl mx-auto">
  <h1 class="text-xl font-semibold mb-6">Record Inventory Count</h1>

  {#if form?.confirmationId}
    <div class="mb-6 rounded bg-green-50 border border-green-200 p-4 text-green-800">
      Count recorded. Confirmation ID: <strong>{form.confirmationId}</strong>
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-6 rounded bg-red-50 border border-red-200 p-4 text-red-800">{form.error}</div>
  {/if}

  <form method="POST" use:enhance class="space-y-6">

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1" for="officeId">Office</label>
      <select id="officeId" name="officeId" required
              class="w-full rounded border-gray-300 text-sm py-2 px-3 border">
        <option value="">— select office —</option>
        {#each data.offices as office (office.id)}
          <option value={office.id}>{office.officeNumber} – {office.name}</option>
        {/each}
      </select>
    </div>

    <div class="space-y-4">
      <p class="text-sm text-gray-500">
        Enter the physical count for each item. Leave blank to skip an item.
      </p>

      {#each data.categories as category (category.id)}
        {@const products = productsForCategory(category.id)}
        {#if products.length > 0}
          <fieldset class="border rounded p-3">
            <legend class="text-sm font-semibold text-gray-700 px-1">{category.name}</legend>
            <div class="space-y-2 mt-2">
              {#each products as product (product.id)}
                <div class="flex items-center justify-between gap-4">
                  <label class="text-sm text-gray-700 flex-1" for="qty_{product.id}">
                    {product.name}
                  </label>
                  <input
                    id="qty_{product.id}"
                    name="qty_{product.id}"
                    type="number"
                    min="0"
                    placeholder="—"
                    class="w-20 text-center rounded border-gray-300 text-sm py-1.5 border"
                  />
                </div>
              {/each}
            </div>
          </fieldset>
        {/if}
      {/each}
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1" for="notes">
        Notes <span class="font-normal text-gray-500">(optional)</span>
      </label>
      <textarea id="notes" name="notes" rows="2"
                class="w-full rounded border-gray-300 text-sm py-2 px-3 border"></textarea>
    </div>

    <button type="submit"
            class="w-full py-3 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
      Submit Count
    </button>
  </form>
</div>
