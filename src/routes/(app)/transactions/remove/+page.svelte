<script lang="ts">
  import TransactionForm from '$lib/components/app/TransactionForm.svelte';
  import type { PageData, ActionData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
</script>
<TransactionForm action="remove" offices={data.offices} products={data.products}
  categories={data.categories} onBehalfUsers={data.onBehalfUsers} {form} />
