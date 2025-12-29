import { defineConfig } from 'vitest/config';
import type { ViteUserConfigExport } from 'vitest/config';

import { vitestBrowserConfigHappyDomNextAppRouter } from '@lellimecnar/vitest-config/browser';

const base =
	vitestBrowserConfigHappyDomNextAppRouter() as unknown as ViteUserConfigExport;

export default defineConfig({
	...base,
	resolve: {
		alias: {
			'@/': new URL('./src/', import.meta.url).pathname,
		},
	},
});
