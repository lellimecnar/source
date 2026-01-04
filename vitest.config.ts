import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['json', 'default'],
		outputFile: './test-output.json',
		coverage: {
			reportsDirectory: './coverage',
		},
		projects: [
			'packages/*/vitest.config.ts',
			'packages/card-stack/*/vitest.config.ts',
			'packages/jsonpath/*/vitest.config.ts',
			'packages/polymix/*/vitest.config.ts',
			'packages/data-map/*/vitest.config.ts',
			'packages/ui-spec/*/vitest.config.ts',
			'web/*/vitest.config.ts',
		],
	},
});
