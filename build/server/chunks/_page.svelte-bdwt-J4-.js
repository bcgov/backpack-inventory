import { ac as ensure_array_like, a8 as escape_html, a7 as attr, ab as attr_class, aa as stringify } from './index3-B028t-nf.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const ACTION_LABELS = {
      receive: "Receive",
      remove: "Remove",
      return: "Return",
      redistribute: "Redistribute",
      inventory_count: "Inventory Count"
    };
    const offices = data.offices;
    const filters = data.filters;
    const history = data.history;
    const months = [...new Set(history.map((r) => r.month))].sort().reverse();
    const historyActions = [...new Set(history.map((r) => r.action))].sort();
    function historyCell(month, action) {
      return history.find((r) => r.month === month && r.action === action) ?? null;
    }
    const staffUsage = data.staffUsage;
    const staffMembers = [
      ...new Map(staffUsage.map((r) => [r.userId, r.userName])).entries()
    ];
    const staffActions = [...new Set(staffUsage.map((r) => r.action))].sort();
    function staffCell(userId, action) {
      return staffUsage.find((r) => r.userId === userId && r.action === action)?.txnCount ?? 0;
    }
    $$renderer2.push(`<div class="max-w-5xl mx-auto space-y-10"><h1 class="text-xl font-semibold">Reports</h1> <form method="GET" class="flex flex-wrap gap-3 items-end bg-gray-50 border rounded p-4"><div><label class="block text-xs text-gray-500 mb-1" for="office">Office</label> <select id="office" name="office" class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`All offices`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array = ensure_array_like(offices);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let o = each_array[$$index];
      $$renderer2.option({ value: o.id, selected: filters.officeId === o.id }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(o.officeNumber)} – ${escape_html(o.name)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></div> <div><label class="block text-xs text-gray-500 mb-1" for="dateFrom">From</label> <input id="dateFrom" name="dateFrom" type="date"${attr("value", filters.dateFrom ?? "")} class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white"/></div> <div><label class="block text-xs text-gray-500 mb-1" for="dateTo">To</label> <input id="dateTo" name="dateTo" type="date"${attr("value", filters.dateTo ?? "")} class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white"/></div> <div class="flex gap-2"><button type="submit" class="py-1.5 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Apply</button> <a href="/reports" class="py-1.5 px-3 border rounded text-sm text-gray-600 hover:bg-gray-100">Clear</a></div></form> <section><h2 class="font-semibold text-gray-800 mb-3">Transaction Activity by Month</h2> `);
    if (months.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-gray-400 text-sm">No transaction data for the selected period.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr class="border-b text-left text-gray-500"><th class="py-2 pr-4 font-medium">Month</th><!--[-->`);
      const each_array_1 = ensure_array_like(historyActions);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let action = each_array_1[$$index_1];
        $$renderer2.push(`<th class="py-2 pr-4 font-medium text-right">${escape_html(ACTION_LABELS[action] ?? action)}</th>`);
      }
      $$renderer2.push(`<!--]--><th class="py-2 font-medium text-right">Total items moved</th></tr></thead><tbody><!--[-->`);
      const each_array_2 = ensure_array_like(months);
      for (let $$index_3 = 0, $$length = each_array_2.length; $$index_3 < $$length; $$index_3++) {
        let month = each_array_2[$$index_3];
        $$renderer2.push(`<tr class="border-b hover:bg-gray-50"><td class="py-2 pr-4 font-medium">${escape_html(month)}</td><!--[-->`);
        const each_array_3 = ensure_array_like(historyActions);
        for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
          let action = each_array_3[$$index_2];
          const cell = historyCell(month, action);
          $$renderer2.push(`<td class="py-2 pr-4 text-right text-gray-600">`);
          if (cell) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`${escape_html(cell.txnCount)} txn${escape_html(cell.txnCount === 1 ? "" : "s")} <span class="text-gray-400">/ ${escape_html(cell.totalItems)} items</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<span class="text-gray-300">—</span>`);
          }
          $$renderer2.push(`<!--]--></td>`);
        }
        $$renderer2.push(`<!--]--><td class="py-2 text-right font-medium">${escape_html(history.filter((r) => r.month === month).reduce((sum, r) => sum + r.totalItems, 0))}</td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]--></section> <section><h2 class="font-semibold text-gray-800 mb-3">System Usage by Staff</h2> `);
    if (staffMembers.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-gray-400 text-sm">No staff activity recorded yet.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr class="border-b text-left text-gray-500"><th class="py-2 pr-4 font-medium">Staff member</th><!--[-->`);
      const each_array_4 = ensure_array_like(staffActions);
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let action = each_array_4[$$index_4];
        $$renderer2.push(`<th class="py-2 pr-4 font-medium text-right">${escape_html(ACTION_LABELS[action] ?? action)}</th>`);
      }
      $$renderer2.push(`<!--]--><th class="py-2 font-medium text-right">Total</th></tr></thead><tbody><!--[-->`);
      const each_array_5 = ensure_array_like(staffMembers);
      for (let $$index_6 = 0, $$length = each_array_5.length; $$index_6 < $$length; $$index_6++) {
        let [userId, userName] = each_array_5[$$index_6];
        const total = staffActions.reduce((sum, a) => sum + staffCell(userId, a), 0);
        $$renderer2.push(`<tr class="border-b hover:bg-gray-50"><td class="py-2 pr-4">${escape_html(userName)}</td><!--[-->`);
        const each_array_6 = ensure_array_like(staffActions);
        for (let $$index_5 = 0, $$length2 = each_array_6.length; $$index_5 < $$length2; $$index_5++) {
          let action = each_array_6[$$index_5];
          const n = staffCell(userId, action);
          $$renderer2.push(`<td${attr_class(`py-2 pr-4 text-right ${stringify(n === 0 ? "text-gray-300" : "")}`)}>${escape_html(n === 0 ? "—" : n)}</td>`);
        }
        $$renderer2.push(`<!--]--><td class="py-2 text-right font-medium">${escape_html(total)}</td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div>`);
    }
    $$renderer2.push(`<!--]--></section></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-bdwt-J4-.js.map
