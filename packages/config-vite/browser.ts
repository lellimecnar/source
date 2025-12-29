import type { UserConfig } from 'vite';

import { viteBaseConfig } from '@lellimecnar/vite-config';

export function viteBrowserConfig(): UserConfig {
	const base = viteBaseConfig();
	return {
		...base,
	};
}
