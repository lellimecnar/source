import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/pointer': path.resolve(__dirname, '../pointer/src/index.ts'),
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../evaluator/src/index.ts',
			),
			'@jsonpath/parser': path.resolve(__dirname, '../parser/src/index.ts'),
		},
	},
});
