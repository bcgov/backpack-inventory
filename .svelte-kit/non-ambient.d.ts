
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/(app)/admin" | "/(app)/admin/offices" | "/(app)/admin/products" | "/(app)/admin/qr-codes" | "/(app)/admin/users" | "/api" | "/api/inventory" | "/api/offices" | "/api/products" | "/api/qr" | "/api/qr/[officeId]" | "/api/qr/[officeId]/[productId]" | "/api/transactions" | "/api/users" | "/app" | "/app/dashboard" | "/app/inventory-count" | "/app/reconcile" | "/app/reports" | "/app/transactions" | "/(app)/audit-log" | "/auth" | "/(app)/dashboard" | "/(app)/inventory-count" | "/(app)/reconcile" | "/(app)/reconcile/[id]" | "/(app)/reports" | "/(app)/scan" | "/(app)/scan/[officeId]" | "/(app)/scan/[officeId]/[productId]" | "/(app)/transactions" | "/(app)/transactions/add" | "/(app)/transactions/redistribute" | "/(app)/transactions/remove" | "/(app)/transactions/return";
		RouteParams(): {
			"/api/qr/[officeId]": { officeId: string };
			"/api/qr/[officeId]/[productId]": { officeId: string; productId: string };
			"/(app)/reconcile/[id]": { id: string };
			"/(app)/scan/[officeId]": { officeId: string };
			"/(app)/scan/[officeId]/[productId]": { officeId: string; productId: string }
		};
		LayoutParams(): {
			"/(app)": { id?: string; officeId?: string; productId?: string };
			"/": { officeId?: string; productId?: string; id?: string };
			"/(app)/admin": Record<string, never>;
			"/(app)/admin/offices": Record<string, never>;
			"/(app)/admin/products": Record<string, never>;
			"/(app)/admin/qr-codes": Record<string, never>;
			"/(app)/admin/users": Record<string, never>;
			"/api": { officeId?: string; productId?: string };
			"/api/inventory": Record<string, never>;
			"/api/offices": Record<string, never>;
			"/api/products": Record<string, never>;
			"/api/qr": { officeId?: string; productId?: string };
			"/api/qr/[officeId]": { officeId: string; productId?: string };
			"/api/qr/[officeId]/[productId]": { officeId: string; productId: string };
			"/api/transactions": Record<string, never>;
			"/api/users": Record<string, never>;
			"/app": Record<string, never>;
			"/app/dashboard": Record<string, never>;
			"/app/inventory-count": Record<string, never>;
			"/app/reconcile": Record<string, never>;
			"/app/reports": Record<string, never>;
			"/app/transactions": Record<string, never>;
			"/(app)/audit-log": Record<string, never>;
			"/auth": Record<string, never>;
			"/(app)/dashboard": Record<string, never>;
			"/(app)/inventory-count": Record<string, never>;
			"/(app)/reconcile": { id?: string };
			"/(app)/reconcile/[id]": { id: string };
			"/(app)/reports": Record<string, never>;
			"/(app)/scan": { officeId?: string; productId?: string };
			"/(app)/scan/[officeId]": { officeId: string; productId?: string };
			"/(app)/scan/[officeId]/[productId]": { officeId: string; productId: string };
			"/(app)/transactions": Record<string, never>;
			"/(app)/transactions/add": Record<string, never>;
			"/(app)/transactions/redistribute": Record<string, never>;
			"/(app)/transactions/remove": Record<string, never>;
			"/(app)/transactions/return": Record<string, never>
		};
		Pathname(): "/" | "/admin/offices" | "/admin/products" | "/admin/qr-codes" | "/admin/users" | "/api/inventory" | "/api/offices" | "/api/products" | `/api/qr/${string}/${string}` & {} | "/api/transactions" | "/api/users" | "/audit-log" | "/dashboard" | "/inventory-count" | "/reconcile" | `/reconcile/${string}` & {} | "/reports" | `/scan/${string}/${string}` & {} | "/transactions/add" | "/transactions/redistribute" | "/transactions/remove" | "/transactions/return";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}