import { viteBaseConfig } from '@lellimecnar/vite-config';

export function viteNodeConfig() {
	const base = viteBaseConfig();
	return {
		...base,
		// Node libraries can override target/externalization per-package.
	};
}
