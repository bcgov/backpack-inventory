import { a8 as escape_html, ab as attr_class, aa as stringify, ac as ensure_array_like, a1 as derived } from './index3-B028t-nf.js';
import './root--oAzNBGx.js';
import './exports-7ECo9oy7.js';
import './state.svelte-07kk-jLd.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    const count = derived(() => data.detail.count);
    const comparison = derived(() => data.detail.comparison);
    const isPending = derived(() => count().status === "pending");
    function discrepancyClass(d) {
      if (d === 0) return "text-gray-500";
      return d > 0 ? "text-amber-600 font-medium" : "text-red-600 font-medium";
    }
    function formatDate(iso) {
      return new Date(iso).toLocaleString("en-CA");
    }
    const REASON_CODES = [
      { value: "RECOUNT", label: "Recount verified" },
      { value: "DATA_ENTRY", label: "Data entry error" },
      { value: "THEFT", label: "Theft / loss" },
      { value: "DAMAGE", label: "Damage / disposal" },
      { value: "OTHER", label: "Other" }
    ];
    $$renderer2.push(`<div class="max-w-3xl mx-auto"><div class="mb-6"><a href="/reconcile" class="text-sm text-blue-600 hover:underline mb-2 inline-block">← Back to pending counts</a> <h1 class="text-xl font-semibold">Inventory Count — ${escape_html(count().confirmationId)}</h1> <p class="text-sm text-gray-500 mt-1">${escape_html(count().officeNumber)} – ${escape_html(count().officeName)} ·
      Submitted by ${escape_html(count().performedByName)} on ${escape_html(formatDate(count().createdAt))}</p> <span${attr_class(`inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded ${stringify(count().status === "pending" ? "bg-amber-100 text-amber-800" : count().status === "accepted" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}`)}>${escape_html(count().status.toUpperCase())}</span></div> `);
    if (form?.success) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-6 rounded bg-green-50 border border-green-200 p-4 text-green-800">Count ${escape_html(form.decision === "accept" ? "accepted" : "rejected")} successfully.</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (form?.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-6 rounded bg-red-50 border border-red-200 p-4 text-red-800">${escape_html(form.error)}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="mb-8 overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr class="border-b text-left text-gray-500"><th class="py-2 pr-4 font-medium">Product</th><th class="py-2 pr-4 font-medium text-right">Physical count</th><th class="py-2 pr-4 font-medium text-right">System stock</th><th class="py-2 font-medium text-right">Discrepancy</th></tr></thead><tbody><!--[-->`);
    const each_array = ensure_array_like(comparison());
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let row = each_array[$$index];
      $$renderer2.push(`<tr class="border-b hover:bg-gray-50"><td class="py-2 pr-4"><span class="text-gray-400 text-xs mr-1">${escape_html(row.categoryName)}</span> ${escape_html(row.productName)}</td><td class="py-2 pr-4 text-right">${escape_html(row.physicalQuantity)}</td><td class="py-2 pr-4 text-right">${escape_html(row.systemQuantity)}</td><td${attr_class(`py-2 text-right ${stringify(discrepancyClass(row.discrepancy))}`)}>${escape_html(row.discrepancy > 0 ? "+" : "")}${escape_html(row.discrepancy)}</td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table> `);
    if (comparison().length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-sm text-gray-400 mt-2">No items recorded in this count.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (isPending()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<form method="POST" class="border rounded p-4 space-y-4 bg-gray-50"><h2 class="font-medium text-gray-800">Record decision</h2> <div><label class="block text-sm font-medium text-gray-700 mb-1" for="reasonCode">Reason code <span class="font-normal text-gray-500">(optional)</span></label> <select id="reasonCode" name="reasonCode" class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white">`);
      $$renderer2.option({ value: "" }, ($$renderer3) => {
        $$renderer3.push(`— select reason —`);
      });
      $$renderer2.push(`<!--[-->`);
      const each_array_1 = ensure_array_like(REASON_CODES);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let rc = each_array_1[$$index_1];
        $$renderer2.option({ value: rc.value }, ($$renderer3) => {
          $$renderer3.push(`${escape_html(rc.label)}`);
        });
      }
      $$renderer2.push(`<!--]--></select></div> <div><label class="block text-sm font-medium text-gray-700 mb-1" for="notes">Notes <span class="font-normal text-gray-500">(optional)</span></label> <textarea id="notes" name="notes" rows="2" class="w-full rounded border-gray-300 text-sm py-2 px-3 border bg-white"></textarea></div> <div class="flex gap-3"><button type="submit" name="decision" value="accept" class="flex-1 py-2 px-4 bg-green-600 text-white rounded font-medium hover:bg-green-700 text-sm">Accept count — update inventory</button> <button type="submit" name="decision" value="reject" class="flex-1 py-2 px-4 bg-red-600 text-white rounded font-medium hover:bg-red-700 text-sm">Reject — no change</button></div></form>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DK_XH1Xz.js.map
