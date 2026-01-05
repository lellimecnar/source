import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		dts({
			insertTypesEntry: true,
		}),
	],
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'JSONPathPluginExtended',
			formats: ['es'],
			fileName: (format) => `index.js`,
		},
		rollupOptions: {
			external: [/^@jsonpath\//],
		},
	},
});
