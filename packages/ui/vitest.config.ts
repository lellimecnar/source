import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

const base = vitestBrowserConfigHappyDom();

export default defineConfig({
	...base,
	resolve: {
		alias: {
			'@/': new URL('./src/', import.meta.url).pathname,
		},
	},
});
