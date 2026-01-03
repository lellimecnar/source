import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

const base = vitestBaseConfig();

export default defineConfig({
	...base,
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
