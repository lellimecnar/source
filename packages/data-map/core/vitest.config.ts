import { defineConfig } from 'vitest/config';
import path from 'path';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

const base = vitestBaseConfig();

export default defineConfig({
	...base,
	resolve: {
		alias: {
			'@jsonpath/compat-json-p3': path.resolve(
				__dirname,
				'../../jsonpath/compat-json-p3/src/index.ts',
			),
			'@jsonpath/jsonpath': path.resolve(
				__dirname,
				'../../jsonpath/jsonpath/src/index.ts',
			),
			'@jsonpath/patch': path.resolve(
				__dirname,
				'../../jsonpath/patch/src/index.ts',
			),
			'@jsonpath/pointer': path.resolve(
				__dirname,
				'../../jsonpath/pointer/src/index.ts',
			),
			'@jsonpath/core': path.resolve(
				__dirname,
				'../../jsonpath/core/src/index.ts',
			),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../../jsonpath/evaluator/src/index.ts',
			),
			'@jsonpath/parser': path.resolve(
				__dirname,
				'../../jsonpath/parser/src/index.ts',
			),
			'@jsonpath/lexer': path.resolve(
				__dirname,
				'../../jsonpath/lexer/src/index.ts',
			),
			'@jsonpath/functions': path.resolve(
				__dirname,
				'../../jsonpath/functions/src/index.ts',
			),
		},
	},
	test: {
		...(base.test ?? {}),
		coverage: {
			...((base.test as any)?.coverage ?? {}),
			thresholds: {
				statements: 90,
				lines: 90,
				branches: 85,
				functions: 95,
			},
		},
	},
});
