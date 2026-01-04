import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { ViteUserConfig } from 'vitest/config';

function resolveLocalFile(pathFromRoot: string) {
	return fileURLToPath(new URL(pathFromRoot, import.meta.url));
}

export function vitestBaseConfig(): ViteUserConfig {
	return {
		plugins: [tsconfigPaths()],
		test: {
			globals: true,
			passWithNoTests: true,
			reporters: ['json', 'default'],
			outputFile: 'test-output.json',
			coverage: {
				provider: 'v8',
				reportsDirectory: 'coverage',
				reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
				// Coverage target is 80% monorepo-wide, but is not enforced yet.
				// To enforce later, add thresholds behind an env flag.
			},
			setupFiles: [resolveLocalFile('./setup/reflect-metadata.ts')],
		},
	};
}
