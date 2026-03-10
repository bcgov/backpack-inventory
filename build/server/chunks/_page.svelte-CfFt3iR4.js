import { a8 as escape_html, ac as ensure_array_like, a7 as attr, aa as stringify } from './index3-B028t-nf.js';
import './root--oAzNBGx.js';
import './exports-7ECo9oy7.js';
import './state.svelte-07kk-jLd.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    function productsForCategory(catId) {
      return data.products.filter((p) => p.categoryId === catId);
    }
    $$renderer2.push(`<div class="max-w-2xl mx-auto"><h1 class="text-xl font-semibold mb-6">Record Inventory Count</h1> `);
    if (form?.confirmationId) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-6 rounded bg-green-50 border border-green-200 p-4 text-green-800">Count recorded. Confirmation ID: <strong>${escape_html(form.confirmationId)}</strong></div>`);
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
    $$renderer2.push(`<!--]--> <form method="POST" class="space-y-6"><div><label class="block text-sm font-medium text-gray-700 mb-1" for="officeId">Office</label> <select id="officeId" name="officeId" required="" class="w-full rounded border-gray-300 text-sm py-2 px-3 border">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`— select office —`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array = ensure_array_like(data.offices);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let office = each_array[$$index];
      $$renderer2.option({ value: office.id }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(office.officeNumber)} – ${escape_html(office.name)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></div> <div class="space-y-4"><p class="text-sm text-gray-500">Enter the physical count for each item. Leave blank to skip an item.</p> <!--[-->`);
    const each_array_1 = ensure_array_like(data.categories);
    for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
      let category = each_array_1[$$index_2];
      const products = productsForCategory(category.id);
      if (products.length > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<fieldset class="border rounded p-3"><legend class="text-sm font-semibold text-gray-700 px-1">${escape_html(category.name)}</legend> <div class="space-y-2 mt-2"><!--[-->`);
        const each_array_2 = ensure_array_like(products);
        for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
          let product = each_array_2[$$index_1];
          $$renderer2.push(`<div class="flex items-center justify-between gap-4"><label class="text-sm text-gray-700 flex-1"${attr("for", `qty_${stringify(product.id)}`)}>${escape_html(product.name)}</label> <input${attr("id", `qty_${stringify(product.id)}`)}${attr("name", `qty_${stringify(product.id)}`)} type="number" min="0" placeholder="—" class="w-20 text-center rounded border-gray-300 text-sm py-1.5 border"/></div>`);
        }
        $$renderer2.push(`<!--]--></div></fieldset>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div> <div><label class="block text-sm font-medium text-gray-700 mb-1" for="notes">Notes <span class="font-normal text-gray-500">(optional)</span></label> <textarea id="notes" name="notes" rows="2" class="w-full rounded border-gray-300 text-sm py-2 px-3 border"></textarea></div> <button type="submit" class="w-full py-3 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Submit Count</button></form></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CfFt3iR4.js.map
