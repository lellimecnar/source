import { defineConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseConfig = vitestBaseConfig();

export default defineConfig({
	...baseConfig,
	resolve: {
		alias: {
			'@jsonpath/jsonpath': path.resolve(__dirname, '../jsonpath/src/index.ts'),
			'@jsonpath/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@jsonpath/evaluator': path.resolve(
				__dirname,
				'../evaluator/src/index.ts',
			),
			'@jsonpath/parser': path.resolve(__dirname, '../parser/src/index.ts'),
			'@jsonpath/lexer': path.resolve(__dirname, '../lexer/src/index.ts'),
			'@jsonpath/compiler': path.resolve(__dirname, '../compiler/src/index.ts'),
			'@jsonpath/pointer': path.resolve(__dirname, '../pointer/src/index.ts'),
			'@jsonpath/patch': path.resolve(__dirname, '../patch/src/index.ts'),
			'@jsonpath/merge-patch': path.resolve(
				__dirname,
				'../merge-patch/src/index.ts',
			),
		},
	},
	test: {
		...(baseConfig as any).test,
		browser: {
			enabled: true,
			name: 'chromium',
			provider: 'playwright',
		},
	},
});
