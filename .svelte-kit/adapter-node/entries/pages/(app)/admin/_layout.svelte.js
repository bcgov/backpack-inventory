import { c as ensure_array_like, a as attr, e as escape_html } from "../../../../chunks/index3.js";
import { b as base } from "../../../../chunks/server.js";
import "../../../../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
function _layout($$renderer, $$props) {
  let { children } = $$props;
  const tabs = [
    { href: `${base}/admin/users`, label: "Users" },
    { href: `${base}/admin/products`, label: "Products" },
    { href: `${base}/admin/offices`, label: "Offices" },
    { href: `${base}/admin/qr-codes`, label: "QR Codes" }
  ];
  $$renderer.push(`<div><h1 class="text-xl font-semibold mb-4">Admin</h1> <nav class="flex gap-1 mb-6 border-b border-gray-200"><!--[-->`);
  const each_array = ensure_array_like(tabs);
  for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
    let tab = each_array[$$index];
    $$renderer.push(`<a${attr("href", tab.href)} class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 -mb-px">${escape_html(tab.label)}</a>`);
  }
  $$renderer.push(`<!--]--></nav> `);
  children($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  _layout as default
};
