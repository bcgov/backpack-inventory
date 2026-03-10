<script lang="ts">
  import { enhance } from '$app/forms';
  import { base }    from '$app/paths';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let submitting = $state(false);
</script>

<div class="max-w-sm mx-auto pt-6 pb-10 px-4">
  {#if form?.confirmationId}
    <!-- ── Success ───────────────────────────────────────────────────────── -->
    <div class="text-center space-y-5">
      <div class="bg-green-50 border border-green-200 rounded-xl p-6">
        <p class="text-sm font-medium text-green-700">Transaction recorded</p>
        <p class="text-3xl font-mono font-bold text-green-900 mt-1 tracking-widest">
          {form.confirmationId}
        </p>
        <p class="text-xs text-green-600 mt-2">{data.office.name} — {data.product.name}</p>
      </div>

      <!-- Reload the same page to record another for the same product/office -->
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href="{base}/scan/{data.office.id}/{data.product.id}"
         class="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center">
        Record Another
      </a>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href="{base}/dashboard" class="block text-sm text-gray-500 underline">
        Back to Dashboard
      </a>
    </div>

  {:else}
    <!-- ── Form ─────────────────────────────────────────────────────────── -->
    <div class="mb-5 bg-gray-50 rounded-lg p-3 border border-gray-200">
      <p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Recording for</p>
      <p class="text-base font-semibold text-gray-900 mt-0.5">{data.product.name}</p>
      <p class="text-sm text-gray-500">{data.office.name}</p>
    </div>

    {#if form?.error}
      <div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
        {form.error}
      </div>
    {/if}

    <form method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => { await update(); submitting = false; };
      }}
      class="space-y-4"
    >
      <!-- Action -->
      <div>
        <p class="text-sm font-medium text-gray-700 mb-2">Action</p>
        <div class="grid grid-cols-2 gap-2">
          {#each [{ value: 'receive', label: 'Receive' }, { value: 'remove', label: 'Remove' }] as opt (opt.value)}
            <label class="cursor-pointer">
              <input type="radio" name="action" value={opt.value} class="sr-only" required />
              <span class="
                block text-center py-3 rounded-lg border-2 text-sm font-medium
                border-gray-300 hover:border-blue-400
                has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700
              ">
                {opt.label}
              </span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Quantity -->
      <div>
        <label for="qty" class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
        <input
          id="qty"
          type="number"
          name="quantity"
          min="1"
          required
          inputmode="numeric"
          class="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg text-center"
          placeholder="0"
        />
      </div>

      <!-- Notes (optional) -->
      <div>
        <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
          Notes <span class="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows="2"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={submitting}
        class="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium text-base"
      >
        {submitting ? 'Saving…' : 'Submit'}
      </button>
    </form>
  {/if}
</div>
