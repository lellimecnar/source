import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

const base = vitestBaseConfig();

export default defineConfig({
	...base,
	test: {
		...base.test,
		include: ['src/**/*.spec.ts'],
		exclude: ['dist/**'],
	},
});
