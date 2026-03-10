import { c as ensure_array_like, e as escape_html, a as attr, s as stringify, d as derived } from "../../../../../chunks/index3.js";
import { b as base } from "../../../../../chunks/server.js";
import "../../../../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const activeProducts = derived(() => data.products.filter((p) => p.isActive !== false));
    function productsForCategory(categoryId) {
      return activeProducts().filter((p) => p.categoryId === categoryId);
    }
    $$renderer2.push(`<div><div class="flex flex-wrap items-end gap-4 mb-6"><form method="GET" class="flex items-end gap-2"><div><label for="officeId" class="block text-sm font-medium text-gray-700 mb-1">Office</label> <select id="officeId" name="officeId" class="border border-gray-300 rounded px-3 py-2 text-sm"><!--[-->`);
    const each_array = ensure_array_like(data.offices);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let office = each_array[$$index];
      $$renderer2.option(
        {
          value: office.id,
          selected: office.id === data.selectedOffice?.id
        },
        ($$renderer3) => {
          $$renderer3.push(`${escape_html(office.name)}`);
        }
      );
    }
    $$renderer2.push(`<!--]--></select></div></form> `);
    if (data.selectedOffice) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<button class="px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">Print sheet</button>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (!data.selectedOffice) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="text-gray-500 text-sm">No offices found in your scope.</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="text-sm text-gray-500 mb-4">Scan these codes with a mobile device to record transactions for <strong>${escape_html(data.selectedOffice.name)}</strong>.</p> <!--[-->`);
      const each_array_1 = ensure_array_like(data.categories);
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let category = each_array_1[$$index_2];
        const products = productsForCategory(category.id);
        if (products.length > 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<section class="mb-8 print:break-inside-avoid-page"><h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 border-b pb-1">${escape_html(category.name)}</h2> <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4"><!--[-->`);
          const each_array_2 = ensure_array_like(products);
          for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
            let product = each_array_2[$$index_1];
            $$renderer2.push(`<div class="border border-gray-200 rounded-lg p-3 text-center print:break-inside-avoid"><img${attr("src", `${stringify(base)}/api/qr/${stringify(data.selectedOffice.id)}/${stringify(product.id)}`)}${attr("alt", `QR code — ${stringify(product.name)} at ${stringify(data.selectedOffice.name)}`)} class="w-28 h-28 mx-auto" loading="lazy"/> <p class="text-xs font-medium text-gray-800 mt-2 leading-tight">${escape_html(product.name)}</p> <p class="text-[10px] text-gray-400 mt-0.5">${escape_html(data.selectedOffice.name)}</p></div>`);
          }
          $$renderer2.push(`<!--]--></div></section>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
