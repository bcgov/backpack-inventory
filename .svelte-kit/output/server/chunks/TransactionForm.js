import { e as escape_html, a as attr, c as ensure_array_like } from "./index3.js";
import "@sveltejs/kit/internal";
import "./url.js";
import "./utils.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./exports.js";
import "./state.svelte.js";
function TransactionForm($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      action,
      offices,
      products,
      categories,
      onBehalfUsers = [],
      destinationOffices = [],
      form = null
    } = $$props;
    let lineItems = [{ productId: "", quantity: 1, otherDescription: "" }];
    function isOther(productId) {
      return products.find((p) => p.id === productId)?.isOther ?? false;
    }
    const actionLabels = {
      receive: "Receive Order",
      return: "Return to Storage",
      remove: "Remove Items",
      redistribute: "Redistribute Items"
    };
    $$renderer2.push(`<div class="max-w-2xl mx-auto"><h1 class="text-xl font-semibold mb-6">${escape_html(actionLabels[action])}</h1> `);
    if (form?.confirmationId) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-6 rounded bg-green-50 border border-green-200 p-4 text-green-800">✓ Transaction recorded. Confirmation ID: <strong>${escape_html(form.confirmationId)}</strong></div>`);
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
    $$renderer2.push(`<!--]--> <form method="POST" enctype="multipart/form-data" class="space-y-5"><input type="hidden" name="action"${attr("value", action)}/> <div><label class="block text-sm font-medium text-gray-700 mb-1" for="officeId">Office</label> <select id="officeId" name="officeId" required="" class="w-full rounded border-gray-300 text-sm py-2 px-3 border">`);
    $$renderer2.option({ value: "" }, ($$renderer3) => {
      $$renderer3.push(`— select office —`);
    });
    $$renderer2.push(`<!--[-->`);
    const each_array = ensure_array_like(offices);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let o = each_array[$$index];
      $$renderer2.option({ value: o.id }, ($$renderer3) => {
        $$renderer3.push(`${escape_html(o.officeNumber)} – ${escape_html(o.name)}`);
      });
    }
    $$renderer2.push(`<!--]--></select></div> `);
    if (action === "redistribute") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div><label class="block text-sm font-medium text-gray-700 mb-1" for="destinationOfficeId">Destination Office</label> <select id="destinationOfficeId" name="destinationOfficeId" required="" class="w-full rounded border-gray-300 text-sm py-2 px-3 border">`);
      $$renderer2.option({ value: "" }, ($$renderer3) => {
        $$renderer3.push(`— select destination —`);
      });
      $$renderer2.push(`<!--[-->`);
      const each_array_1 = ensure_array_like(destinationOffices);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let o = each_array_1[$$index_1];
        $$renderer2.option({ value: o.id }, ($$renderer3) => {
          $$renderer3.push(`${escape_html(o.officeNumber)} – ${escape_html(o.name)}`);
        });
      }
      $$renderer2.push(`<!--]--></select></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (onBehalfUsers.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div><label class="block text-sm font-medium text-gray-700 mb-1" for="performedByUserId">Record on behalf of <span class="font-normal text-gray-500">(leave blank for yourself)</span></label> <select id="performedByUserId" name="performedByUserId" class="w-full rounded border-gray-300 text-sm py-2 px-3 border">`);
      $$renderer2.option({ value: "" }, ($$renderer3) => {
        $$renderer3.push(`— myself —`);
      });
      $$renderer2.push(`<!--[-->`);
      const each_array_2 = ensure_array_like(onBehalfUsers);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let u = each_array_2[$$index_2];
        $$renderer2.option({ value: u.id }, ($$renderer3) => {
          $$renderer3.push(`${escape_html(u.name)}`);
        });
      }
      $$renderer2.push(`<!--]--></select></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <fieldset class="space-y-3"><legend class="text-sm font-medium text-gray-700">Items</legend> <!--[-->`);
    const each_array_3 = ensure_array_like(lineItems);
    for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
      let item = each_array_3[i];
      $$renderer2.push(`<div class="flex gap-2 items-start"><div class="flex-1 space-y-1">`);
      $$renderer2.select(
        {
          name: "productId",
          value: item.productId,
          required: true,
          class: "w-full rounded border-gray-300 text-sm py-2 px-3 border"
        },
        ($$renderer3) => {
          $$renderer3.option({ value: "" }, ($$renderer4) => {
            $$renderer4.push(`— product —`);
          });
          $$renderer3.push(`<!--[-->`);
          const each_array_4 = ensure_array_like(categories);
          for (let $$index_4 = 0, $$length2 = each_array_4.length; $$index_4 < $$length2; $$index_4++) {
            let cat = each_array_4[$$index_4];
            $$renderer3.push(`<optgroup${attr("label", cat.name)}><!--[-->`);
            const each_array_5 = ensure_array_like(products.filter((p) => p.categoryId === cat.id));
            for (let $$index_3 = 0, $$length3 = each_array_5.length; $$index_3 < $$length3; $$index_3++) {
              let p = each_array_5[$$index_3];
              $$renderer3.option({ value: p.id }, ($$renderer4) => {
                $$renderer4.push(`${escape_html(p.name)}`);
              });
            }
            $$renderer3.push(`<!--]--></optgroup>`);
          }
          $$renderer3.push(`<!--]-->`);
        }
      );
      $$renderer2.push(` `);
      if (isOther(item.productId)) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<input type="text" name="otherDescription"${attr("value", item.otherDescription)} placeholder="Describe item…" class="w-full rounded border-gray-300 text-sm py-1.5 px-3 border"/>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> <div class="flex items-center gap-1 shrink-0"><button type="button" class="w-9 h-9 rounded border text-lg font-bold text-gray-600 hover:bg-gray-100">−</button> <input type="number" name="quantity"${attr("value", item.quantity)} min="1" required="" class="w-14 text-center rounded border-gray-300 text-sm py-2 border"/> <button type="button" class="w-9 h-9 rounded border text-lg font-bold text-gray-600 hover:bg-gray-100">+</button></div> `);
      if (lineItems.length > 1) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button type="button" class="shrink-0 text-red-500 hover:text-red-700 text-sm mt-2">✕</button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--> <button type="button" class="text-sm text-blue-600 hover:underline">+ Add another item</button></fieldset> <div><label class="block text-sm font-medium text-gray-700 mb-1" for="notes">Notes <span class="font-normal text-gray-500">(optional)</span></label> <textarea id="notes" name="notes" rows="2" class="w-full rounded border-gray-300 text-sm py-2 px-3 border"></textarea></div> `);
    if (action === "receive") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div><label class="block text-sm font-medium text-gray-700 mb-1" for="shippingReceipt">Shipping receipt <span class="font-normal text-gray-500">(optional)</span></label> <input id="shippingReceipt" type="file" name="shippingReceipt" accept="image/*,.pdf" class="w-full text-sm text-gray-600"/></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit" class="w-full py-3 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Submit</button></form></div>`);
  });
}
export {
  TransactionForm as T
};
