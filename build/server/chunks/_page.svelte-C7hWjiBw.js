import { a8 as escape_html, ac as ensure_array_like, ab as attr_class, aa as stringify, a7 as attr } from './index3-B028t-nf.js';
import './root--oAzNBGx.js';
import './exports-7ECo9oy7.js';
import './state.svelte-07kk-jLd.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    if (form?.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">${escape_html(form.error)}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left px-3 py-2 font-medium text-gray-600">#</th><th class="text-left px-3 py-2 font-medium text-gray-600">Name</th><th class="text-left px-3 py-2 font-medium text-gray-600">Type</th><th class="text-left px-3 py-2 font-medium text-gray-600">Team</th><th class="text-left px-3 py-2 font-medium text-gray-600">Region</th><th class="text-left px-3 py-2 font-medium text-gray-600">Status</th><th class="px-3 py-2"></th></tr></thead><tbody class="divide-y divide-gray-100"><!--[-->`);
    const each_array = ensure_array_like(data.offices);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let o = each_array[$$index];
      $$renderer2.push(`<tr${attr_class(`hover:bg-gray-50 ${stringify(o.isActive ? "" : "opacity-50")}`)}><td class="px-3 py-2 text-gray-500">${escape_html(o.officeNumber)}</td><td class="px-3 py-2 font-medium">${escape_html(o.name)}</td><td class="px-3 py-2 text-gray-500">${escape_html(o.officeType ?? "—")}</td><td class="px-3 py-2 text-gray-500">${escape_html(o.teamName)}</td><td class="px-3 py-2 text-gray-500">${escape_html(o.regionName)}</td><td class="px-3 py-2"><span${attr_class(`inline-block px-2 py-0.5 rounded text-xs ${stringify(o.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}`)}>${escape_html(o.isActive ? "Active" : "Inactive")}</span></td><td class="px-3 py-2"><form method="POST" action="?/toggleOffice"><input type="hidden" name="officeId"${attr("value", o.id)}/> <input type="hidden" name="isActive"${attr("value", String(!o.isActive))}/> <button type="submit"${attr_class(`text-xs px-2 py-1 rounded border ${stringify(o.isActive ? "text-red-600 border-red-200 hover:bg-red-50" : "text-green-600 border-green-200 hover:bg-green-50")}`)}>${escape_html(o.isActive ? "Deactivate" : "Activate")}</button></form></td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C7hWjiBw.js.map
