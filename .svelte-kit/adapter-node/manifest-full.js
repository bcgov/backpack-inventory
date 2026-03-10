export const manifest = (() => {
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
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js')),
			__memo(() => import('./nodes/9.js')),
			__memo(() => import('./nodes/10.js')),
			__memo(() => import('./nodes/11.js')),
			__memo(() => import('./nodes/12.js')),
			__memo(() => import('./nodes/13.js')),
			__memo(() => import('./nodes/14.js')),
			__memo(() => import('./nodes/15.js')),
			__memo(() => import('./nodes/16.js')),
			__memo(() => import('./nodes/17.js')),
			__memo(() => import('./nodes/18.js')),
			__memo(() => import('./nodes/19.js'))
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
				endpoint: __memo(() => import('./entries/endpoints/api/inventory/_server.ts.js'))
			},
			{
				id: "/api/offices",
				pattern: /^\/api\/offices\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/offices/_server.ts.js'))
			},
			{
				id: "/api/products",
				pattern: /^\/api\/products\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/products/_server.ts.js'))
			},
			{
				id: "/api/qr/[officeId]/[productId]",
				pattern: /^\/api\/qr\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"officeId","optional":false,"rest":false,"chained":false},{"name":"productId","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/qr/_officeId_/_productId_/_server.ts.js'))
			},
			{
				id: "/api/transactions",
				pattern: /^\/api\/transactions\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/transactions/_server.ts.js'))
			},
			{
				id: "/api/users",
				pattern: /^\/api\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/users/_server.ts.js'))
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
