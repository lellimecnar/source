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
			'@jsonpath/compiler': path.resolve(__dirname, '../compiler/src/index.ts'),
			'@jsonpath/filter-eval': path.resolve(
				__dirname,
				'../filter-eval/src/index.ts',
			),
			'@jsonpath/pointer': path.resolve(__dirname, '../pointer/src/index.ts'),
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/lexer': path.resolve(__dirname, '../lexer/src/index.ts'),
			'@jsonpath/functions': path.resolve(
				__dirname,
				'../functions/src/index.ts',
			),
			'@jsonpath/patch': path.resolve(__dirname, '../patch/src/index.ts'),
			'@jsonpath/merge-patch': path.resolve(
				__dirname,
				'../merge-patch/src/index.ts',
			),
			'@jsonpath/plugin-arithmetic': path.resolve(
				__dirname,
				'../plugin-arithmetic/src/index.ts',
			),
			'@jsonpath/plugin-extras': path.resolve(
				__dirname,
				'../plugin-extras/src/index.ts',
			),
			'@jsonpath/compat-json-p3': path.resolve(
				__dirname,
				'../compat-json-p3/src/index.ts',
			),
			'@jsonpath/schema': path.resolve(__dirname, '../schema/src/index.ts'),
		},
	},
});
