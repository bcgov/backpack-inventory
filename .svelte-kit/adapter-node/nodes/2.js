import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.7v4ORlqZ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/BSIeCu24.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/DgflIAKz.js","_app/immutable/chunks/CfG_s9zU.js","_app/immutable/chunks/Dx78MLBa.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/chunks/1qvwCiOG.js"];
export const stylesheets = [];
export const fonts = [];
