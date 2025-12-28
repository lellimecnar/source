import type { ViteUserConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from './vitest.browser.js';

export function vitestBrowserConfigJsdom(): ViteUserConfig {
	const base = vitestBrowserConfigHappyDom();

	return {
		...base,
		test: {
			...base.test,
			environment: 'jsdom',
		},
	};
}
