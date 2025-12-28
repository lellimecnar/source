import { fileURLToPath } from 'node:url';
import type { ViteUserConfig } from 'vitest/config';

import { vitestBaseConfig } from './vitest.base.js';

function resolveLocalFile(pathFromRoot: string) {
	return fileURLToPath(new URL(pathFromRoot, import.meta.url));
}

export function vitestBrowserConfigHappyDom(): ViteUserConfig {
	const base = vitestBaseConfig();

	return {
		...base,
		test: {
			...base.test,
			environment: 'happy-dom',
			setupFiles: [
				...(base.test?.setupFiles ?? []),
				resolveLocalFile('./setup/testing-library.ts'),
			],
		},
	};
}

export function vitestBrowserConfigHappyDomNextAppRouter(): ViteUserConfig {
	const base = vitestBrowserConfigHappyDom();

	return {
		...base,
		test: {
			...base.test,
			setupFiles: [
				...(base.test?.setupFiles ?? []),
				resolveLocalFile('./setup/next-app-router.ts'),
			],
		},
	};
}
