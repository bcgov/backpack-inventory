export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19')
];

export const server_loads = [2];

export const dictionary = {
		"/": [~4],
		"/(app)/admin/offices": [~5,[2,3]],
		"/(app)/admin/products": [~6,[2,3]],
		"/(app)/admin/qr-codes": [~7,[2,3]],
		"/(app)/admin/users": [~8,[2,3]],
		"/(app)/audit-log": [~9,[2]],
		"/(app)/dashboard": [~10,[2]],
		"/(app)/inventory-count": [~11,[2]],
		"/(app)/reconcile": [~12,[2]],
		"/(app)/reconcile/[id]": [~13,[2]],
		"/(app)/reports": [~14,[2]],
		"/(app)/scan/[officeId]/[productId]": [~15,[2]],
		"/(app)/transactions/add": [~16,[2]],
		"/(app)/transactions/redistribute": [~17,[2]],
		"/(app)/transactions/remove": [~18,[2]],
		"/(app)/transactions/return": [~19,[2]]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));
export const encoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.encode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';