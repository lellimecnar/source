import { defineConfig, mergeConfig } from 'vitest/config';
import { vitestBaseConfig } from '@lellimecnar/vitest-config';

export default mergeConfig(
	vitestBaseConfig(),
	defineConfig({
		test: {
			name: '@jsonpath/path-builder',
		},
	}),
);
