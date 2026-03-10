import { a as attr, e as escape_html, b as attr_class, c as ensure_array_like, s as stringify } from "../../../chunks/index3.js";
import { b as base } from "../../../chunks/server.js";
import "../../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import { h as hasPermission } from "../../../chunks/types.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, children } = $$props;
    const navLinks = [
      { href: `${base}/dashboard`, label: "Dashboard" },
      // Quick Scan removed — workers arrive via QR code URL directly
      { href: `${base}/transactions/add`, label: "Receive Order" },
      { href: `${base}/transactions/return`, label: "Return Items" },
      { href: `${base}/transactions/remove`, label: "Remove Items" },
      {
        href: `${base}/transactions/redistribute`,
        label: "Redistribute"
      },
      { href: `${base}/inventory-count`, label: "Inventory Count" },
      { href: `${base}/reconcile`, label: "Reconcile" },
      { href: `${base}/audit-log`, label: "Audit Log" },
      { href: `${base}/reports`, label: "Reports" }
    ];
    const canAdmin = hasPermission(data.user.role, "manage_users");
    $$renderer2.push(`<div class="min-h-screen bg-gray-50"><nav class="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30"><div class="flex items-center gap-3"><button class="md:hidden p-1 rounded text-gray-600 hover:bg-gray-100" aria-label="Toggle menu">`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`);
    }
    $$renderer2.push(`<!--]--></button> <a${attr("href", `${stringify(base)}/dashboard`)} class="font-semibold text-gray-900">CISB Inventory</a></div> <div class="flex items-center gap-4 text-sm"><span class="text-gray-500 hidden sm:inline">${escape_html(data.user.name)}</span> <a${attr("href", `${stringify(base)}/auth/signout`)} class="text-red-600 hover:underline">Sign out</a></div></nav> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <aside${attr_class(` fixed top-14 bottom-0 left-0 z-20 w-56 bg-white border-r border-gray-200 p-3 flex flex-col gap-1 overflow-y-auto transition-transform duration-200 ${stringify("-translate-x-full")} md:translate-x-0 `)}><!--[-->`);
    const each_array = ensure_array_like(navLinks);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let link = each_array[$$index];
      $$renderer2.push(`<a${attr("href", link.href)} class="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100">${escape_html(link.label)}</a>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (canAdmin) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="mt-2 pt-2 border-t border-gray-100"><a${attr("href", `${stringify(base)}/admin/users`)} class="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-100 block">Admin</a></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></aside> <main class="md:ml-56 p-4 min-h-screen">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
  });
}
export {
  _layout as default
};
