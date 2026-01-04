import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/jsonpath': path.resolve(__dirname, '../jsonpath/src/index.ts'),
			'@jsonpath/patch': path.resolve(__dirname, '../patch/src/index.ts'),
			'@jsonpath/pointer': path.resolve(__dirname, '../pointer/src/index.ts'),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../evaluator/src/index.ts',
			),
		},
	},
});
