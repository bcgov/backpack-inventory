import { e as escape_html, a as attr, s as stringify, c as ensure_array_like } from "../../../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../../../chunks/url.js";
import "../../../../../../chunks/utils.js";
import { b as base } from "../../../../../../chunks/server.js";
import "@sveltejs/kit/internal/server";
import "../../../../../../chunks/root.js";
import "../../../../../../chunks/exports.js";
import "../../../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    let submitting = false;
    $$renderer2.push(`<div class="max-w-sm mx-auto pt-6 pb-10 px-4">`);
    if (form?.confirmationId) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="text-center space-y-5"><div class="bg-green-50 border border-green-200 rounded-xl p-6"><p class="text-sm font-medium text-green-700">Transaction recorded</p> <p class="text-3xl font-mono font-bold text-green-900 mt-1 tracking-widest">${escape_html(form.confirmationId)}</p> <p class="text-xs text-green-600 mt-2">${escape_html(data.office.name)} — ${escape_html(data.product.name)}</p></div>  <a${attr("href", `${stringify(base)}/scan/${stringify(data.office.id)}/${stringify(data.product.id)}`)} class="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-center">Record Another</a> <a${attr("href", `${stringify(base)}/dashboard`)} class="block text-sm text-gray-500 underline">Back to Dashboard</a></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="mb-5 bg-gray-50 rounded-lg p-3 border border-gray-200"><p class="text-xs text-gray-500 uppercase tracking-wide font-medium">Recording for</p> <p class="text-base font-semibold text-gray-900 mt-0.5">${escape_html(data.product.name)}</p> <p class="text-sm text-gray-500">${escape_html(data.office.name)}</p></div> `);
      if (form?.error) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">${escape_html(form.error)}</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <form method="POST" class="space-y-4"><div><p class="text-sm font-medium text-gray-700 mb-2">Action</p> <div class="grid grid-cols-2 gap-2"><!--[-->`);
      const each_array = ensure_array_like([
        { value: "receive", label: "Receive" },
        { value: "remove", label: "Remove" }
      ]);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let opt = each_array[$$index];
        $$renderer2.push(`<label class="cursor-pointer"><input type="radio" name="action"${attr("value", opt.value)} class="sr-only" required=""/> <span class="block text-center py-3 rounded-lg border-2 text-sm font-medium border-gray-300 hover:border-blue-400 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-700">${escape_html(opt.label)}</span></label>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div><label for="qty" class="block text-sm font-medium text-gray-700 mb-1">Quantity</label> <input id="qty" type="number" name="quantity" min="1" required="" inputmode="numeric" class="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg text-center" placeholder="0"/></div> <div><label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Notes <span class="text-gray-400 font-normal">(optional)</span></label> <textarea id="notes" name="notes" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"></textarea></div> <button type="submit"${attr("disabled", submitting, true)} class="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium text-base">${escape_html("Submit")}</button></form>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
