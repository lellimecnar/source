import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		projects: [
			'packages/*/vitest.config.ts',
			'packages/card-stack/*/vitest.config.ts',
			'packages/ui-spec/*/vitest.config.ts',
			'web/*/vitest.config.ts',
		],
	},
});
