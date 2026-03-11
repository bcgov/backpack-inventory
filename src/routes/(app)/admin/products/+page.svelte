<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let newCategoryId = $state('');
  let newName = $state('');
</script>

{#if form?.addError}
  <div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{form.addError}</div>
{/if}
{#if form?.addSuccess}
  <div class="mb-4 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">Product added.</div>
{/if}

<!-- Add product form -->
<form method="POST" action="?/addProduct" use:enhance
      class="mb-8 flex flex-wrap gap-2 items-end p-4 bg-gray-50 rounded border">
  <div>
    <label for="categoryId" class="block text-xs font-medium text-gray-600 mb-1">Category</label>
    <select id="categoryId" name="categoryId" bind:value={newCategoryId} required
            class="rounded border-gray-300 text-sm py-2 px-3 border">
      <option value="">— select —</option>
      {#each data.categories as cat (cat.id)}
        <option value={cat.id}>{cat.name}</option>
      {/each}
    </select>
  </div>
  <div>
    <label for="productName" class="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
    <input id="productName" type="text" name="name" bind:value={newName} required
           placeholder="e.g. HandSanitizer"
           class="rounded border-gray-300 text-sm py-2 px-3 border w-48" />
  </div>
  <button type="submit"
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
    Add Product
  </button>
</form>

<!-- Products grouped by category -->
{#each data.categories as cat (cat.id)}
  <div class="mb-6">
    <h2 class="text-sm font-semibold text-gray-700 mb-2">{cat.name}</h2>
    <div class="space-y-1">
      {#each cat.products as product (product.id)}
        <div class="flex items-center justify-between px-3 py-2 rounded border bg-white
                    {product.isActive ? '' : 'opacity-50'}">
          <span class="text-sm">{product.name}
            {#if product.isOther}<span class="text-xs text-gray-400 ml-1">(catch-all)</span>{/if}
          </span>
          <form method="POST" action="?/toggleProduct" use:enhance class="flex items-center gap-2">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="isActive" value={String(!product.isActive)} />
            <button type="submit"
                    class="text-xs px-2 py-1 rounded border
                           {product.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}">
              {product.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </form>
        </div>
      {/each}
    </div>
  </div>
{/each}
