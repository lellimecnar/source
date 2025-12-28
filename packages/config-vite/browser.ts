import type { UserConfig } from 'vite';

import { viteBaseConfig } from './vite.base.js';

export function viteBrowserConfig(): UserConfig {
	const base = viteBaseConfig();
	return {
		...base,
	};
}
