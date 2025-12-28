import { defineConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

const base = vitestBrowserConfigHappyDom();

export default defineConfig({
	...base,
	test: {
		...base.test,
		include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
		exclude: ['dist/**'],
	},
});
