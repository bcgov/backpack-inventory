<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();

  const placeholders = {
    order_placed:    ['{orderId}', '{officeNumber}', '{officeName}', '{itemList}', '{notes}', '{createdBy}'],
    order_cancelled: ['{orderId}', '{officeNumber}', '{officeName}', '{itemsRemaining}', '{itemsAlreadyReceived}', '{cancelledBy}'],
  };
</script>

{#if form?.success}
  <div class="mb-4 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">Template "{form.key}" saved.</div>
{/if}
{#if form?.error}
  <div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{form.error}</div>
{/if}

<div class="space-y-8">
  {#each [
    { key: 'order_placed',    label: 'Order placed',    template: data.placed },
    { key: 'order_cancelled', label: 'Order cancelled', template: data.cancelled },
  ] as card (card.key)}
    <form method="POST" action="?/save" use:enhance class="border rounded p-4 space-y-3">
      <h2 class="font-semibold text-gray-800">{card.label} email</h2>
      <input type="hidden" name="key" value={card.key} />
      <div>
        <label class="block text-xs text-gray-500 mb-1" for="subject-{card.key}">Subject</label>
        <input id="subject-{card.key}" name="subject" type="text" value={card.template.subject}
               class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white" />
      </div>
      <div>
        <label class="block text-xs text-gray-500 mb-1" for="body-{card.key}">Body</label>
        <textarea id="body-{card.key}" name="body" rows="8"
                  class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white font-mono">{card.template.body}</textarea>
      </div>
      <p class="text-xs text-gray-500">
        Placeholders:
        {#each placeholders[card.key] as ph (ph)}<code class="mr-2">{ph}</code>{/each}
      </p>
      <button type="submit" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
        Save
      </button>
    </form>
  {/each}
</div>
