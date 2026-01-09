import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { vitestBaseConfig } from '@lellimecnar/vitest-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseConfig = vitestBaseConfig();

export default defineConfig({
	...baseConfig,
	resolve: {
		alias: {
			'@data-map/core': path.resolve(__dirname, '../core/src/index.ts'),
			'@data-map/storage': path.resolve(__dirname, '../storage/src/index.ts'),
			'@data-map/signals': path.resolve(__dirname, '../signals/src/index.ts'),
			'@data-map/subscriptions': path.resolve(
				__dirname,
				'../subscriptions/src/index.ts',
			),
			'@data-map/arrays': path.resolve(__dirname, '../arrays/src/index.ts'),
			'@data-map/path': path.resolve(__dirname, '../path/src/index.ts'),
			'@data-map/computed': path.resolve(__dirname, '../computed/src/index.ts'),
		},
	},
	test: {
		...(baseConfig as any).test,
		// Browser config is optional and disabled by default
		// To enable browser benchmarks, install @vitest/browser-playwright and configure provider
	},
});
