import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDomNextAppRouter } from '@lellimecnar/vitest-config/browser';

const base = vitestBrowserConfigHappyDomNextAppRouter();

export default defineConfig({
	...base,
	resolve: {
		alias: {
			'@/': new URL('./src/', import.meta.url).pathname,
		},
	},
});
