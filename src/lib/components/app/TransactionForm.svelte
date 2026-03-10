<script lang="ts">
  import { enhance } from '$app/forms';

  interface Props {
    action: 'receive' | 'remove' | 'return' | 'redistribute';
    offices: Array<{ id: string; officeNumber: string; name: string }>;
    products: Array<{ id: string; name: string; categoryId: string; isOther: boolean }>;
    categories: Array<{ id: string; name: string }>;
    /** Users eligible for "record on behalf of"; empty = hide the field */
    onBehalfUsers?: Array<{ id: string; name: string }>;
    /** Second office list for redistribute destination */
    destinationOffices?: Array<{ id: string; officeNumber: string; name: string }>;
    form?: { error?: string; confirmationId?: string } | null;
  }

  let {
    action,
    offices,
    products,
    categories,
    onBehalfUsers = [],
    destinationOffices = [],
    form = null,
  }: Props = $props();

  let lineItems: Array<{ productId: string; quantity: number; otherDescription: string }> =
    $state([{ productId: '', quantity: 1, otherDescription: '' }]);

  function addLineItem() {
    lineItems = [...lineItems, { productId: '', quantity: 1, otherDescription: '' }];
  }
  function removeLineItem(i: number) {
    lineItems = lineItems.filter((_, idx) => idx !== i);
  }
  function isOther(productId: string) {
    return products.find((p) => p.id === productId)?.isOther ?? false;
  }

  const actionLabels: Record<string, string> = {
    receive:      'Receive Order',
    return:       'Return to Storage',
    remove:       'Remove Items',
    redistribute: 'Redistribute Items',
  };
</script>

<div class="max-w-2xl mx-auto">
  <h1 class="text-xl font-semibold mb-6">{actionLabels[action]}</h1>

  {#if form?.confirmationId}
    <div class="mb-6 rounded bg-green-50 border border-green-200 p-4 text-green-800">
      ✓ Transaction recorded. Confirmation ID: <strong>{form.confirmationId}</strong>
    </div>
  {/if}

  {#if form?.error}
    <div class="mb-6 rounded bg-red-50 border border-red-200 p-4 text-red-800">{form.error}</div>
  {/if}

  <form method="POST" use:enhance enctype="multipart/form-data" class="space-y-5">
    <input type="hidden" name="action" value={action} />

    <!-- Office selector -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1" for="officeId">Office</label>
      <select id="officeId" name="officeId" required
              class="w-full rounded border-gray-300 text-sm py-2 px-3 border">
        <option value="">— select office —</option>
        {#each offices as o (o.id)}
          <option value={o.id}>{o.officeNumber} – {o.name}</option>
        {/each}
      </select>
    </div>

    <!-- Destination office (redistribute only) -->
    {#if action === 'redistribute'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="destinationOfficeId">
          Destination Office
        </label>
        <select id="destinationOfficeId" name="destinationOfficeId" required
                class="w-full rounded border-gray-300 text-sm py-2 px-3 border">
          <option value="">— select destination —</option>
          {#each destinationOffices as o (o.id)}
            <option value={o.id}>{o.officeNumber} – {o.name}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Record on behalf of (supervisor+ only) -->
    {#if onBehalfUsers.length > 0}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="performedByUserId">
          Record on behalf of <span class="font-normal text-gray-500">(leave blank for yourself)</span>
        </label>
        <select id="performedByUserId" name="performedByUserId"
                class="w-full rounded border-gray-300 text-sm py-2 px-3 border">
          <option value="">— myself —</option>
          {#each onBehalfUsers as u (u.id)}
            <option value={u.id}>{u.name}</option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Line items -->
    <fieldset class="space-y-3">
      <legend class="text-sm font-medium text-gray-700">Items</legend>
      {#each lineItems as item, i (i)}
        <div class="flex gap-2 items-start">
          <div class="flex-1 space-y-1">
            <select name="productId" bind:value={item.productId} required
                    class="w-full rounded border-gray-300 text-sm py-2 px-3 border">
              <option value="">— product —</option>
              {#each categories as cat (cat.id)}
                <optgroup label={cat.name}>
                  {#each products.filter((p) => p.categoryId === cat.id) as p (p.id)}
                    <option value={p.id}>{p.name}</option>
                  {/each}
                </optgroup>
              {/each}
            </select>
            {#if isOther(item.productId)}
              <input type="text" name="otherDescription" bind:value={item.otherDescription}
                     placeholder="Describe item…"
                     class="w-full rounded border-gray-300 text-sm py-1.5 px-3 border" />
            {/if}
          </div>

          <!-- Quantity stepper (mobile-friendly) -->
          <div class="flex items-center gap-1 shrink-0">
            <button type="button"
                    onclick={() => item.quantity = Math.max(1, item.quantity - 1)}
                    class="w-9 h-9 rounded border text-lg font-bold text-gray-600 hover:bg-gray-100">−</button>
            <input type="number" name="quantity" bind:value={item.quantity}
                   min="1" required
                   class="w-14 text-center rounded border-gray-300 text-sm py-2 border" />
            <button type="button"
                    onclick={() => item.quantity++}
                    class="w-9 h-9 rounded border text-lg font-bold text-gray-600 hover:bg-gray-100">+</button>
          </div>

          {#if lineItems.length > 1}
            <button type="button" onclick={() => removeLineItem(i)}
                    class="shrink-0 text-red-500 hover:text-red-700 text-sm mt-2">✕</button>
          {/if}
        </div>
      {/each}

      <button type="button" onclick={addLineItem}
              class="text-sm text-blue-600 hover:underline">+ Add another item</button>
    </fieldset>

    <!-- Notes -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1" for="notes">Notes
        <span class="font-normal text-gray-500">(optional)</span>
      </label>
      <textarea id="notes" name="notes" rows="2"
                class="w-full rounded border-gray-300 text-sm py-2 px-3 border"></textarea>
    </div>

    <!-- Shipping receipt (receive only) -->
    {#if action === 'receive'}
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1" for="shippingReceipt">
          Shipping receipt <span class="font-normal text-gray-500">(optional)</span>
        </label>
        <input id="shippingReceipt" type="file" name="shippingReceipt"
               accept="image/*,.pdf"
               class="w-full text-sm text-gray-600" />
      </div>
    {/if}

    <button type="submit"
            class="w-full py-3 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
      Submit
    </button>
  </form>
</div>
