import { f as fail } from './index-B2LGyy1l.js';
import { g as getDb, a as getSchema } from './index2-BRX5Berz.js';
import { a as toggleProduct, b as addProduct, c as listCategories } from './admin-D6cQCER8.js';
import './shared-server-DaWdgxVh.js';
import 'crypto';
import './types-Dpk4TN7N.js';

const load = async () => {
  const db = await getDb();
  const schema = await getSchema();
  return { categories: await listCategories(db, schema) };
};
const actions = {
  addProduct: async ({ request }) => {
    const db = await getDb();
    const schema = await getSchema();
    const data = await request.formData();
    const categoryId = data.get("categoryId");
    const name = data.get("name")?.trim();
    if (!name) return fail(400, { addError: "Product name is required" });
    if (!categoryId) return fail(400, { addError: "Category is required" });
    try {
      await addProduct(db, schema, { categoryId, name });
      return { addSuccess: true };
    } catch (e) {
      return fail(400, { addError: e instanceof Error ? e.message : "Failed to add product" });
    }
  },
  toggleProduct: async ({ request }) => {
    const db = await getDb();
    const schema = await getSchema();
    const data = await request.formData();
    const productId = data.get("productId");
    const isActive = data.get("isActive") === "true";
    try {
      await toggleProduct(db, schema, productId, isActive);
      return { toggleSuccess: true };
    } catch (e) {
      return fail(400, { toggleError: e instanceof Error ? e.message : "Failed" });
    }
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Bm6-B9e2.js')).default;
const server_id = "src/routes/(app)/admin/products/+page.server.ts";
const imports = ["_app/immutable/nodes/6.DjEiw_1-.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/DyAjWB2Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Dx78MLBa.js","_app/immutable/chunks/Ltm9fTdL.js","_app/immutable/chunks/hE7HE9bc.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-DceD3hpj.js.map
