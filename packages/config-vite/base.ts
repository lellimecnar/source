import type { UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export function viteBaseConfig(): UserConfig {
	return {
		plugins: [tsconfigPaths()],
		build: {
			// Each package defines its own lib entry/outDir.
			emptyOutDir: true,
		},
	};
}
