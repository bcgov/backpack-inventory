const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["robots.txt"]),
	mimeTypes: {".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.C_s9og6Z.js",app:"_app/immutable/entry/app.CuSosxL2.js",imports:["_app/immutable/entry/start.C_s9og6Z.js","_app/immutable/chunks/Pi8bXYsL.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/DAcvOs1t.js","_app/immutable/entry/app.CuSosxL2.js","_app/immutable/chunks/uwKY8xQT.js","_app/immutable/chunks/DIeogL5L.js","_app/immutable/chunks/Cm6brbW_.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/1qvwCiOG.js","_app/immutable/chunks/C4P3zt49.js","_app/immutable/chunks/Peabs2Tj.js","_app/immutable/chunks/DRU176QL.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-BHQyBngd.js')),
			__memo(() => import('./chunks/1-DXkDM1k7.js')),
			__memo(() => import('./chunks/2-_jV4efPh.js')),
			__memo(() => import('./chunks/3-sE1P1ZVP.js')),
			__memo(() => import('./chunks/4-CuVV31SH.js')),
			__memo(() => import('./chunks/5-BysHLRs0.js')),
			__memo(() => import('./chunks/6-DceD3hpj.js')),
			__memo(() => import('./chunks/7-z48ZPA1q.js')),
			__memo(() => import('./chunks/8-C_MRfBWL.js')),
			__memo(() => import('./chunks/9-DMhdMdIO.js')),
			__memo(() => import('./chunks/10-CeIp5zbQ.js')),
			__memo(() => import('./chunks/11-CZSoBej3.js')),
			__memo(() => import('./chunks/12-BiPpPIZh.js')),
			__memo(() => import('./chunks/13-DmICmBkq.js')),
			__memo(() => import('./chunks/14-ZkOjhXyG.js')),
			__memo(() => import('./chunks/15-CsV9trYV.js')),
			__memo(() => import('./chunks/16-yV7oF9de.js')),
			__memo(() => import('./chunks/17-orLFiIsd.js')),
			__memo(() => import('./chunks/18-CpA5EQkq.js')),
			__memo(() => import('./chunks/19-DNUrB52e.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(app)/admin/offices",
				pattern: /^\/admin\/offices\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(app)/admin/products",
				pattern: /^\/admin\/products\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(app)/admin/qr-codes",
				pattern: /^\/admin\/qr-codes\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(app)/admin/users",
				pattern: /^\/admin\/users\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/api/inventory",
				pattern: /^\/api\/inventory\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DvCMT9mV.js'))
			},
			{
				id: "/api/offices",
				pattern: /^\/api\/offices\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CkyIYysp.js'))
			},
			{
				id: "/api/products",
				pattern: /^\/api\/products\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D5VMA-OP.js'))
			},
			{
				id: "/api/qr/[officeId]/[productId]",
				pattern: /^\/api\/qr\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"officeId","optional":false,"rest":false,"chained":false},{"name":"productId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DET8SJYB.js'))
			},
			{
				id: "/api/transactions",
				pattern: /^\/api\/transactions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BEM7t2Uk.js'))
			},
			{
				id: "/api/users",
				pattern: /^\/api\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D_1s-n6i.js'))
			},
			{
				id: "/(app)/audit-log",
				pattern: /^\/audit-log\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(app)/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/(app)/inventory-count",
				pattern: /^\/inventory-count\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/(app)/reconcile",
				pattern: /^\/reconcile\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/(app)/reconcile/[id]",
				pattern: /^\/reconcile\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/(app)/reports",
				pattern: /^\/reports\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/(app)/scan/[officeId]/[productId]",
				pattern: /^\/scan\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"officeId","optional":false,"rest":false,"chained":false},{"name":"productId","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,2,], errors: [1,,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/(app)/transactions/add",
				pattern: /^\/transactions\/add\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/(app)/transactions/redistribute",
				pattern: /^\/transactions\/redistribute\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/(app)/transactions/remove",
				pattern: /^\/transactions\/remove\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/(app)/transactions/return",
				pattern: /^\/transactions\/return\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 19 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
