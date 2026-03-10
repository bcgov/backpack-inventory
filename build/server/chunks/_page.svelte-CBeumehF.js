import { ac as ensure_array_like, a8 as escape_html, ab as attr_class, aa as stringify, a7 as attr } from './index3-B028t-nf.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const { officeGroups, offices, selectedOffice, config } = data;
    const colorClasses = {
      green: { badge: "bg-green-100 text-green-800", row: "", text: "" },
      yellow: {
        badge: "bg-yellow-100 text-yellow-800",
        row: "bg-yellow-50",
        text: "text-yellow-700 font-semibold"
      },
      red: {
        badge: "bg-red-100 text-red-800",
        row: "bg-red-50",
        text: "text-red-700 font-semibold"
      },
      none: { badge: "", row: "", text: "" }
    };
    function formatDays(days) {
      if (days === null) return "—";
      if (days === 0) return "0 d";
      return `${days} d`;
    }
    function formatRate(rate) {
      if (rate === null || rate <= 0) return "—";
      return `${rate.toFixed(1)}/day`;
    }
    $$renderer2.push(`<div class="max-w-5xl mx-auto"><div class="flex items-center justify-between mb-6"><h1 class="text-xl font-semibold">Current Inventory</h1> <form method="GET" class="flex gap-2 items-center"><select name="office" class="rounded border-gray-300 text-sm py-1.5 px-2 border bg-white">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`All offices in scope`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array = ensure_array_like(offices);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let o = each_array[$$index];
      $$renderer2.option({ value: o.id, selected: selectedOffice === o.id }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(o.officeNumber)} – ${escape_html(o.name)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></form></div> <div class="flex gap-4 mb-4 text-xs text-gray-500"><span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-green-400"></span> >${escape_html(config.greenDays)} days</span> <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-yellow-400"></span> ${escape_html(config.yellowDays)}–${escape_html(config.greenDays)} days</span> <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-red-400"></span> &lt;${escape_html(config.yellowDays)} days</span> <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-gray-200"></span> No burn data</span></div> `);
    if (officeGroups.length === 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-gray-400 text-sm">No inventory data yet. Record some transactions to get started.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="space-y-6"><!--[-->`);
      const each_array_1 = ensure_array_like(officeGroups);
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let group = each_array_1[$$index_2];
        $$renderer2.push(`<div class="border rounded overflow-hidden"><div class="bg-gray-50 px-4 py-2 border-b"><h2 class="font-medium text-sm">${escape_html(group.officeNumber)} — ${escape_html(group.officeName)}</h2></div> <table class="w-full text-sm"><thead><tr class="border-b text-left text-gray-500"><th class="py-2 px-4 font-medium">Product</th><th class="py-2 px-4 font-medium text-right">Qty</th><th class="py-2 px-4 font-medium text-right">Days remaining</th><th class="py-2 px-4 font-medium text-right">Burn rate</th><th class="py-2 px-4 font-medium text-right">Updated</th></tr></thead><tbody><!--[-->`);
        const each_array_2 = ensure_array_like(group.items);
        for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
          let item = each_array_2[$$index_1];
          const cls = colorClasses[item.color];
          $$renderer2.push(`<tr${attr_class(`border-b last:border-0 hover:bg-gray-50 ${stringify(cls.row)}`)}><td class="py-2 px-4">${escape_html(item.productName)}</td><td class="py-2 px-4 text-right font-mono">${escape_html(item.currentQty)}</td><td class="py-2 px-4 text-right">`);
          if (item.color !== "none") {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span${attr_class(`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${stringify(cls.badge)}`)}>${escape_html(formatDays(item.daysRemaining))}</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<span class="text-gray-400 text-xs">${escape_html(formatDays(item.daysRemaining))}</span>`);
          }
          $$renderer2.push(`<!--]--> `);
          if (item.burnRateSource === "global") {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="ml-1 text-xs text-gray-400" title="Using global product average">~</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]--></td><td class="py-2 px-4 text-right text-gray-400 text-xs"${attr("title", `Source: ${stringify(item.burnRateSource)}`)}>${escape_html(formatRate(item.dailyBurnRate))}</td><td class="py-2 px-4 text-right text-gray-400 text-xs">${escape_html(new Date(item.updatedAt).toLocaleDateString("en-CA"))}</td></tr>`);
        }
        $$renderer2.push(`<!--]--></tbody></table></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CBeumehF.js.map
