import { r as redirect } from './index-B2LGyy1l.js';

const load = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/auth/signin");
  return { user: locals.user };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-d7NWM35s.js')).default;
const server_id = "src/routes/(app)/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.7v4ORlqZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/BSIeCu24.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Dx78MLBa.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/1qvwCiOG.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-_jV4efPh.js.map
