import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	// postgres is optional (only used when DB_DRIVER=postgres). Externalize so
	// the SQLite dev/test build doesn't fail when the package isn't installed.
	build: {
		rollupOptions: {
			external: ['postgres'],
			// Limit parallel file processing in memory-constrained CI/build pods.
			// OpenShift build pods set CI=true; default is 20 which can exhaust a 2 GB limit.
			maxParallelFileOps: process.env.CI ? 3 : 20,
		},
		// Run SSR and client builds sequentially rather than concurrently.
		// Both builds hold their full module graphs in memory during the rendering
		// phase; running them at the same time doubles peak memory in a 2 GB pod.
		concurrentBuilds: !process.env.CI,
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
