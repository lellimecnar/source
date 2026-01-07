import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	...vitestBaseConfig(),
	test: {
		...vitestBaseConfig().test,
		benchmark: {
			include: ['**/*.bench.ts'],
			reporters: ['default'],
			outputJson: './benchmark-results.json',
		},
	},
	resolve: {
		alias: {
			'@data-map/core': path.resolve(__dirname, '../core/src/index.ts'),

			'@jsonpath/core': path.resolve(
				__dirname,
				'../../jsonpath/core/src/index.ts',
			),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../../jsonpath/evaluator/src/index.ts',
			),
			'@jsonpath/compiler': path.resolve(
				__dirname,
				'../../jsonpath/compiler/src/index.ts',
			),
			'@jsonpath/jsonpath': path.resolve(
				__dirname,
				'../../jsonpath/jsonpath/src/index.ts',
			),
			'@jsonpath/pointer': path.resolve(
				__dirname,
				'../../jsonpath/pointer/src/index.ts',
			),
			'@jsonpath/patch': path.resolve(
				__dirname,
				'../../jsonpath/patch/src/index.ts',
			),
		},
	},
});
