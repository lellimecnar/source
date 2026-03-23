import tsconfigPaths from 'vite-tsconfig-paths';

export function viteBaseConfig() {
	return {
		plugins: [tsconfigPaths()],
		build: {
			// Each package defines its own lib entry/outDir.
			emptyOutDir: true,
		},
	};
}
