import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';

export default defineConfig({
	...vitestBaseConfig(),
	resolve: {
		alias: {
			'@jsonpath/parser': path.resolve(__dirname, '../parser/src/index.ts'),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../evaluator/src/index.ts',
			),
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/lexer': path.resolve(__dirname, '../lexer/src/index.ts'),
			'@jsonpath/functions': path.resolve(
				__dirname,
				'../functions/src/index.ts',
			),
		},
	},
});
