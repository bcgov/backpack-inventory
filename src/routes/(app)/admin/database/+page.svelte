<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageData, ActionData } from './$types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  type ModalKind = 'seed' | 'clear' | null;
  let modal      = $state<ModalKind>(null);
  let submitting = $state<ModalKind>(null);

  function openModal(kind: Exclude<ModalKind, null>) {
    modal = kind;
  }

  function closeModal() {
    if (submitting) return; // don't dismiss while an action is running
    modal = null;
  }

  const formError = $derived(form && 'error' in form ? form.error : null);
  const formSuccess = $derived(form && 'success' in form && form.success ? form : null);
</script>

<div class="max-w-2xl">
  <p class="text-sm text-gray-600 mb-6">
    Manage the local development database. Operations only run when
    <code class="px-1 py-0.5 bg-gray-100 rounded text-xs">DB_DRIVER=sqlite</code>.
    Current driver:
    <code class="px-1 py-0.5 bg-gray-100 rounded text-xs">{data.driver}</code>.
  </p>

  {#if formError}
    <div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">{formError}</div>
  {/if}

  {#if formSuccess && formSuccess.action === 'seed'}
    <div class="mb-4 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
      Test data seeded successfully.
    </div>
  {/if}

  {#if formSuccess && formSuccess.action === 'clear'}
    <div class="mb-4 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
      Database cleared.
      {#if formSuccess.archivedAs}
        Previous file archived to
        <code class="px-1 py-0.5 bg-green-100 rounded text-xs">{formSuccess.archivedAs}</code>.
      {/if}
    </div>
  {/if}

  <div class="space-y-4">
    <section class="border border-gray-200 rounded-lg p-4">
      <h2 class="font-medium mb-1">Seed test data</h2>
      <p class="text-sm text-gray-600 mb-3">
        Runs <code class="px-1 py-0.5 bg-gray-100 rounded text-xs">npm run db:seed:dev</code> to add
        mock users and roughly 2,000 deterministic transactions to the current database.
      </p>
      <button type="button"
              disabled={!data.supported}
              class="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              onclick={() => openModal('seed')}>
        Seed test data
      </button>
    </section>

    <section class="border border-red-200 rounded-lg p-4 bg-red-50/30">
      <h2 class="font-medium mb-1 text-red-900">Clear database</h2>
      <p class="text-sm text-gray-700 mb-3">
        Archives the current database file into
        <code class="px-1 py-0.5 bg-white border rounded text-xs">db-archive/</code>
        with a timestamp, then re-runs migrations and the reference seed. The original file is not
        deleted.
      </p>
      <button type="button"
              disabled={!data.supported}
              class="px-3 py-2 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              onclick={() => openModal('clear')}>
        Clear database
      </button>
    </section>
  </div>
</div>

{#if modal !== null}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
       role="presentation"
       onclick={closeModal}
       onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}>
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
         role="dialog"
         tabindex="-1"
         aria-modal="true"
         aria-labelledby="confirm-modal-title"
         onclick={(e) => e.stopPropagation()}
         onkeydown={(e) => e.stopPropagation()}>
      {#if modal === 'seed'}
        <h2 id="confirm-modal-title" class="text-lg font-semibold mb-2">Seed test data?</h2>
        <p class="text-sm text-gray-600 mb-6">
          This will insert mock users and roughly 2,000 deterministic transactions into the
          current database. Existing rows whose ids start with <code class="px-1 bg-gray-100 rounded">dev-</code>
          will be replaced. The operation may take 10&ndash;30 seconds.
        </p>
      {:else}
        <h2 id="confirm-modal-title" class="text-lg font-semibold mb-2 text-red-900">Clear database?</h2>
        <p class="text-sm text-gray-600 mb-6">
          The current SQLite file will be moved to <code class="px-1 bg-gray-100 rounded">db-archive/</code>
          with a timestamped name. A new database will be created, migrated, and reference-seeded.
          Any unsaved state in the current DB will only be reachable from the archive.
        </p>
      {/if}
      <form method="POST"
            action={modal === 'seed' ? '?/seed' : '?/clear'}
            use:enhance={() => {
              submitting = modal;
              return async ({ update }) => {
                await update();
                submitting = null;
                modal = null;
              };
            }}>
        <div class="flex justify-end gap-2">
          <button type="button"
                  disabled={submitting !== null}
                  class="px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                  onclick={closeModal}>
            Cancel
          </button>
          <button type="submit"
                  disabled={submitting !== null}
                  class="px-3 py-2 text-sm rounded text-white disabled:opacity-60
                         {modal === 'clear' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}">
            {#if submitting !== null}
              Running&hellip;
            {:else if modal === 'clear'}
              Clear database
            {:else}
              Seed test data
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
