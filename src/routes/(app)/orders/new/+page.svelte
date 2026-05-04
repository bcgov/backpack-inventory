<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();

  const offices = $derived(data.offices);
  const rows    = $derived(data.forecastRows);
  const grouped = $derived(() => {
    const m = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = m.get(r.categoryId) ?? [];
      list.push(r);
      m.set(r.categoryId, list);
    }
    return [...m.entries()];
  });

  // Mutable qty state per productId
  let qtys = $state<Record<string, number>>({});
  let otherLines = $state<Array<{ desc: string; qty: number }>>([]);

  function fillForThirtyDays() {
    const next: Record<string, number> = {};
    for (const r of rows) {
      if (r.dailyBurnRate === null || r.dailyBurnRate <= 0) continue;
      const target = Math.ceil(30 * r.dailyBurnRate);
      next[r.productId] = Math.max(0, target - r.currentQty);
    }
    qtys = next;
  }

  function addOther() { otherLines = [...otherLines, { desc: '', qty: 0 }]; }
</script>

<div class="max-w-4xl mx-auto">
  <h1 class="text-xl font-semibold mb-6">New order</h1>

  {#if form?.error}
    <div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{form.error}</div>
  {/if}

  <form method="GET" class="mb-4 flex gap-2 items-end">
    <div>
      <label class="block text-xs text-gray-500 mb-1" for="office-select">Office</label>
      <select id="office-select" name="office"
              onchange={(e) => goto(`?office=${(e.currentTarget as HTMLSelectElement).value}`, { keepFocus: true })}
              class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">
        {#each offices as o (o.id)}
          <option value={o.id} selected={data.selectedOffice === o.id}>{o.officeNumber} – {o.name}</option>
        {/each}
      </select>
    </div>
    <button type="button" onclick={fillForThirtyDays}
            class="px-3 py-1.5 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300">
      Order for next 30 days
    </button>
  </form>

  <form method="POST" class="space-y-6">
    <input type="hidden" name="officeId" value={data.selectedOffice ?? ''} />

    {#each grouped() as [categoryId, products] (categoryId)}
      <section class="border rounded">
        <div class="bg-gray-50 px-3 py-2 border-b text-sm font-medium">{products[0]?.productName?.split('—')[0] ?? 'Items'}</div>
        <table class="w-full text-sm">
          <thead><tr class="text-left text-gray-500 border-b">
            <th class="py-1 px-3 font-normal">Product</th>
            <th class="py-1 px-3 font-normal text-right">Current</th>
            <th class="py-1 px-3 font-normal text-right">Burn/day</th>
            <th class="py-1 px-3 font-normal text-right">Order qty</th>
          </tr></thead>
          <tbody>
            {#each products as p (p.productId)}
              <tr class="border-b last:border-0">
                <td class="py-1 px-3">{p.productName}</td>
                <td class="py-1 px-3 text-right text-gray-500">{p.currentQty}</td>
                <td class="py-1 px-3 text-right text-gray-500">{p.dailyBurnRate?.toFixed(1) ?? '—'}</td>
                <td class="py-1 px-3 text-right">
                  <input type="number" min="0" name="qty:{p.productId}" bind:value={qtys[p.productId]}
                         class="w-20 rounded border-gray-300 text-sm py-1 px-2 border text-right" />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/each}

    <section class="border rounded p-3">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm font-medium">Other items</span>
        <button type="button" onclick={addOther} class="text-xs text-blue-600 hover:underline">+ Add</button>
      </div>
      {#each otherLines as line, i (i)}
        <div class="flex gap-2 mb-2">
          <input type="text" name="otherDesc:{i}" bind:value={line.desc} placeholder="Description"
                 class="flex-1 rounded border-gray-300 text-sm py-1 px-2 border" />
          <input type="number" min="0" name="otherQty:{i}" bind:value={line.qty}
                 class="w-20 rounded border-gray-300 text-sm py-1 px-2 border text-right" />
        </div>
      {/each}
    </section>

    <div>
      <label class="block text-xs text-gray-500 mb-1" for="notes">Notes</label>
      <textarea id="notes" name="notes" rows="2"
                class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white"></textarea>
    </div>

    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Place order
    </button>
  </form>
</div>
