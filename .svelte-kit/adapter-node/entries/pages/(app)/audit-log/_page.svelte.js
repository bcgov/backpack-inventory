import { c as ensure_array_like, e as escape_html, a as attr } from "../../../../chunks/index3.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const {
      rows,
      total,
      page,
      pageSize,
      filters,
      offices,
      users,
      actions
    } = data;
    const totalPages = Math.ceil(total / pageSize);
    const ACTION_LABELS = {
      receive: "Receive",
      remove: "Remove",
      return: "Return",
      redistribute: "Redistribute",
      inventory_count: "Inventory Count"
    };
    function formatDate(iso) {
      return new Date(iso).toLocaleString("en-CA", { dateStyle: "short", timeStyle: "short" });
    }
    function pageUrl(p) {
      const params = new URLSearchParams({
        ...filters.officeId ? { office: filters.officeId } : {},
        ...filters.action ? { action: filters.action } : {},
        ...filters.performedByUserId ? { user: filters.performedByUserId } : {},
        ...filters.dateFrom ? { dateFrom: filters.dateFrom } : {},
        ...filters.dateTo ? { dateTo: filters.dateTo } : {},
        page: String(p)
      });
      return `?${params}`;
    }
    $$renderer2.push(`<div class="max-w-6xl mx-auto"><h1 class="text-xl font-semibold mb-4">Audit Log</h1> <form method="GET" class="mb-6 flex flex-wrap gap-3 items-end bg-gray-50 border rounded p-4"><div><label class="block text-xs text-gray-500 mb-1" for="office">Office</label> <select id="office" name="office" class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">`);
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
    $$renderer2.push(`<!--]--></select></div> <div><label class="block text-xs text-gray-500 mb-1" for="action">Action</label> <select id="action" name="action" class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`All actions`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array_1 = ensure_array_like(actions);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let a = each_array_1[$$index_1];
      $$renderer2.option({ value: a, selected: filters.action === a }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(ACTION_LABELS[a] ?? a)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></div> <div><label class="block text-xs text-gray-500 mb-1" for="user">Staff member</label> <select id="user" name="user" class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`All staff`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array_2 = ensure_array_like(users);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let u = each_array_2[$$index_2];
      $$renderer2.option({ value: u.id, selected: filters.performedByUserId === u.id }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(u.name)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></div> <div><label class="block text-xs text-gray-500 mb-1" for="dateFrom">From</label> <input id="dateFrom" name="dateFrom" type="date"${attr("value", filters.dateFrom ?? "")} class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white"/></div> <div><label class="block text-xs text-gray-500 mb-1" for="dateTo">To</label> <input id="dateTo" name="dateTo" type="date"${attr("value", filters.dateTo ?? "")} class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white"/></div> <div class="flex gap-2"><button type="submit" class="py-1.5 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Filter</button> <a href="/audit-log" class="py-1.5 px-3 border rounded text-sm text-gray-600 hover:bg-gray-100">Clear</a></div></form> <p class="text-sm text-gray-500 mb-3">${escape_html(total)} transaction${escape_html(total === 1 ? "" : "s")} `);
    if (total > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`— showing ${escape_html(page * pageSize + 1)}–${escape_html(Math.min((page + 1) * pageSize, total))}`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></p> `);
    if (rows.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-gray-400 text-sm">No transactions match the current filters.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr class="border-b text-left text-gray-500"><th class="py-2 pr-3 font-medium">ID</th><th class="py-2 pr-3 font-medium">Action</th><th class="py-2 pr-3 font-medium">Office</th><th class="py-2 pr-3 font-medium">Items</th><th class="py-2 pr-3 font-medium">Performed by</th><th class="py-2 pr-3 font-medium">Recorded by</th><th class="py-2 font-medium">Date</th></tr></thead><tbody><!--[-->`);
      const each_array_3 = ensure_array_like(rows);
      for (let $$index_4 = 0, $$length = each_array_3.length; $$index_4 < $$length; $$index_4++) {
        let row = each_array_3[$$index_4];
        $$renderer2.push(`<tr class="border-b hover:bg-gray-50 align-top"><td class="py-2 pr-3 font-mono text-xs">${escape_html(row.confirmationId)}</td><td class="py-2 pr-3">${escape_html(ACTION_LABELS[row.action] ?? row.action)}</td><td class="py-2 pr-3 whitespace-nowrap">${escape_html(row.officeNumber)} – ${escape_html(row.officeName)}</td><td class="py-2 pr-3"><!--[-->`);
        const each_array_4 = ensure_array_like(row.lineItems);
        for (let i = 0, $$length2 = each_array_4.length; i < $$length2; i++) {
          let li = each_array_4[i];
          $$renderer2.push(`<div>${escape_html(li.productName)}${escape_html(li.otherDesc ? ` (${li.otherDesc})` : "")} × ${escape_html(li.quantity)}</div>`);
        }
        $$renderer2.push(`<!--]--></td><td class="py-2 pr-3">${escape_html(row.performedByName)}</td><td class="py-2 pr-3">${escape_html(row.performedByUserId === row.recordedByUserId ? "—" : row.recordedByName)}</td><td class="py-2 whitespace-nowrap text-gray-500">${escape_html(formatDate(row.createdAt))}</td></tr>`);
      }
      $$renderer2.push(`<!--]--></tbody></table></div> `);
      if (totalPages > 1) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="mt-4 flex gap-2 items-center text-sm">`);
        if (page > 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<a${attr("href", pageUrl(page - 1))} class="px-3 py-1 border rounded hover:bg-gray-100">Previous</a>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <span class="text-gray-500">Page ${escape_html(page + 1)} of ${escape_html(totalPages)}</span> `);
        if (page < totalPages - 1) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<a${attr("href", pageUrl(page + 1))} class="px-3 py-1 border rounded hover:bg-gray-100">Next</a>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
