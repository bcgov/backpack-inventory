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
    if (form?.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-4 rounded bg-red-50 border border-red-200 p-3 text-red-800 text-sm">${escape_html(form.error)}</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (form?.success) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mb-4 rounded bg-green-50 border border-green-200 p-3 text-green-800 text-sm">User updated.</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-gray-50"><tr><th class="text-left px-3 py-2 font-medium text-gray-600">Name</th><th class="text-left px-3 py-2 font-medium text-gray-600">Email</th><th class="text-left px-3 py-2 font-medium text-gray-600">Role</th><th class="text-left px-3 py-2 font-medium text-gray-600">Team / Region</th><th class="text-left px-3 py-2 font-medium text-gray-600">Active</th><th class="px-3 py-2"></th></tr></thead><tbody class="divide-y divide-gray-100"><!--[-->`);
    const each_array = ensure_array_like(data.users);
    for (let $$index_3 = 0, $$length = each_array.length; $$index_3 < $$length; $$index_3++) {
      let u = each_array[$$index_3];
      $$renderer2.push(`<tr class="hover:bg-gray-50"><td class="px-3 py-2">${escape_html(u.name)}</td><td class="px-3 py-2 text-gray-500">${escape_html(u.email)}</td><td class="px-3 py-2"><form method="POST" action="?/updateUser" class="flex flex-wrap gap-2 items-center"><input type="hidden" name="userId"${attr("value", u.id)}/> `);
      $$renderer2.select(
        {
          name: "role",
          value: u.role,
          class: "rounded border-gray-300 text-xs py-1 px-2 border"
        },
        ($$renderer3) => {
          $$renderer3.push(`<!--[-->`);
          const each_array_1 = ensure_array_like(data.roles);
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let r = each_array_1[$$index];
            $$renderer3.option({ value: r, selected: u.role === r }, ($$renderer4) => {
              $$renderer4.push(`${escape_html(r)}`);
            });
          }
          $$renderer3.push(`<!--]-->`);
        }
      );
      $$renderer2.push(` <select name="teamId" class="rounded border-gray-300 text-xs py-1 px-2 border">`);
      $$renderer2.option({ value: "" }, ($$renderer3) => {
        $$renderer3.push(`— no team —`);
      });
      $$renderer2.push(`<!--[-->`);
      const each_array_2 = ensure_array_like(data.teams);
      for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
        let t = each_array_2[$$index_1];
        $$renderer2.option({ value: t.id, selected: u.teamId === t.id }, ($$renderer3) => {
          $$renderer3.push(`${escape_html(t.name)}`);
        });
      }
      $$renderer2.push(`<!--]--></select> <select name="regionId" class="rounded border-gray-300 text-xs py-1 px-2 border">`);
      $$renderer2.option({ value: "" }, ($$renderer3) => {
        $$renderer3.push(`— no region —`);
      });
      $$renderer2.push(`<!--[-->`);
      const each_array_3 = ensure_array_like(data.regions);
      for (let $$index_2 = 0, $$length2 = each_array_3.length; $$index_2 < $$length2; $$index_2++) {
        let r = each_array_3[$$index_2];
        $$renderer2.option({ value: r.id, selected: u.regionId === r.id }, ($$renderer3) => {
          $$renderer3.push(`${escape_html(r.name)}`);
        });
      }
      $$renderer2.push(`<!--]--></select> <select name="isActive" class="rounded border-gray-300 text-xs py-1 px-2 border">`);
      $$renderer2.option({ value: "true", selected: u.isActive }, ($$renderer3) => {
        $$renderer3.push(`Active`);
      });
      $$renderer2.option({ value: "false", selected: !u.isActive }, ($$renderer3) => {
        $$renderer3.push(`Inactive`);
      });
      $$renderer2.push(`</select> <button type="submit" class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Save</button></form></td><td class="px-3 py-2 text-gray-400 text-xs">${escape_html(u.teamId ?? u.regionId ?? "—")}</td><td class="px-3 py-2"><span${attr_class(`inline-block px-2 py-0.5 rounded text-xs ${stringify(u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}`)}>${escape_html(u.isActive ? "Active" : "Inactive")}</span></td><td></td></tr>`);
    }
    $$renderer2.push(`<!--]--></tbody></table></div>`);
  });
}
export {
  _page as default
};
