import type { ViteUserConfig } from 'vitest/config';

import { vitestBrowserConfigHappyDom } from '@lellimecnar/vitest-config/browser';

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
