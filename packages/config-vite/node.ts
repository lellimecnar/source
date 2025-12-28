import type { UserConfig } from 'vite';

import { viteBaseConfig } from './vite.base.js';

export function viteNodeConfig(): UserConfig {
	const base = viteBaseConfig();
	return {
		...base,
		// Node libraries can override target/externalization per-package.
	};
}
