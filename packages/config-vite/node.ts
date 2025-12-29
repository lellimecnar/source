import type { UserConfig } from 'vite';

import { viteBaseConfig } from '@lellimecnar/vite-config';

export function viteNodeConfig(): UserConfig {
	const base = viteBaseConfig();
	return {
		...base,
		// Node libraries can override target/externalization per-package.
	};
}
