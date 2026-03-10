import { ac as ensure_array_like, a8 as escape_html, a7 as attr, aa as stringify } from './index3-B028t-nf.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    function formatDate(iso) {
      return new Date(iso).toLocaleDateString("en-CA");
    }
    $$renderer2.push(`<div class="max-w-4xl mx-auto"><h1 class="text-xl font-semibold mb-6">Pending Inventory Counts</h1> `);
    if (data.counts.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-gray-500 text-sm">No pending inventory counts in your scope.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr class="border-b text-left text-gray-500"><th class="py-2 pr-4 font-medium">Confirmation ID</th><th class="py-2 pr-4 font-medium">Office</th><th class="py-2 pr-4 font-medium">Submitted by</th><th class="py-2 pr-4 font-medium">Date</th><th class="py-2 font-medium"></th></tr></thead><tbody><!--[-->`);
      const each_array = ensure_array_like(data.counts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let count = each_array[$$index];
        $$renderer2.push(`<tr class="border-b hover:bg-gray-50"><td class="py-2 pr-4 font-mono">${escape_html(count.confirmationId)}</td><td class="py-2 pr-4">${escape_html(count.officeNumber)} – ${escape_html(count.officeName)}</td><td class="py-2 pr-4">${escape_html(count.performedByName)}</td><td class="py-2 pr-4">${escape_html(formatDate(count.createdAt))}</td><td class="py-2"><a${attr("href", `/reconcile/${stringify(count.transactionId)}`)} class="text-blue-600 hover:underline text-sm">Review</a></td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Db0B0Fc9.js.map
