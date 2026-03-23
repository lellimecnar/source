import { viteBaseConfig } from '@lellimecnar/vite-config';

export function viteBrowserConfig() {
	const base = viteBaseConfig();
	return {
		...base,
	};
}
