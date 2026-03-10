import { e as escape_html, c as ensure_array_like, a as attr, b as attr_class, s as stringify } from "../../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/url.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    let newCategoryId = "";
    let newName = "";
    if (form?.addError) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">${escape_html(form.addError)}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (form?.addSuccess) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-4 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">Product added.</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <form method="POST" action="?/addProduct" class="mb-8 flex flex-wrap gap-2 items-end p-4 bg-gray-50 rounded border"><div><label class="block text-xs font-medium text-gray-600 mb-1">Category</label> `);
    $$renderer2.select(
      {
        name: "categoryId",
        value: newCategoryId,
        required: true,
        class: "rounded border-gray-300 text-sm py-2 px-3 border"
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "" }, ($$renderer4) => {
          $$renderer4.push(`— select —`);
        });
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(data.categories);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let cat = each_array[$$index];
          $$renderer3.option({ value: cat.id }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(cat.name)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</div> <div><label class="block text-xs font-medium text-gray-600 mb-1">Product Name</label> <input type="text" name="name"${attr("value", newName)} required="" placeholder="e.g. HandSanitizer" class="rounded border-gray-300 text-sm py-2 px-3 border w-48"/></div> <button type="submit" class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">Add Product</button></form> <!--[-->`);
    const each_array_1 = ensure_array_like(data.categories);
    for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
      let cat = each_array_1[$$index_2];
      $$renderer2.push(`<div class="mb-6"><h2 class="text-sm font-semibold text-gray-700 mb-2">${escape_html(cat.name)}</h2> <div class="space-y-1"><!--[-->`);
      const each_array_2 = ensure_array_like(cat.products);
      for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
        let product = each_array_2[$$index_1];
        $$renderer2.push(`<div${attr_class(`flex items-center justify-between px-3 py-2 rounded border bg-white ${stringify(product.isActive ? "" : "opacity-50")}`)}><span class="text-sm">${escape_html(product.name)} `);
        if (product.isOther) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="text-xs text-gray-400 ml-1">(catch-all)</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></span> <form method="POST" action="?/toggleProduct" class="flex items-center gap-2"><input type="hidden" name="productId"${attr("value", product.id)}/> <input type="hidden" name="isActive"${attr("value", String(!product.isActive))}/> <button type="submit"${attr_class(`text-xs px-2 py-1 rounded border ${stringify(product.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50")}`)}>${escape_html(product.isActive ? "Deactivate" : "Activate")}</button></form></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
