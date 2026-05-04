<script lang="ts">
  import { enhance } from '$app/forms';
  let { officeId, initialEmails }: { officeId: string; initialEmails: string[] } = $props();
  let expanded = $state(false);
  let value = $state(initialEmails.join('\n'));
</script>

{#if !expanded}
  <button type="button" class="text-xs text-blue-600 hover:underline" onclick={() => (expanded = true)}>
    {initialEmails.length} recipient{initialEmails.length === 1 ? '' : 's'} ✏️
  </button>
{:else}
  <form method="POST" action="?/setRecipients" use:enhance={() => () => { expanded = false; }}
        class="flex flex-col gap-2 mt-1">
    <input type="hidden" name="officeId" value={officeId} />
    <textarea name="emails" rows="3" bind:value
              class="w-full rounded border-gray-300 text-xs py-1 px-2 border font-mono"
              placeholder="one email per line"></textarea>
    <div class="flex gap-2">
      <button type="submit" class="text-xs px-2 py-1 bg-blue-600 text-white rounded">Save</button>
      <button type="button" class="text-xs px-2 py-1 border rounded" onclick={() => { expanded = false; value = initialEmails.join('\n'); }}>Cancel</button>
    </div>
  </form>
{/if}
