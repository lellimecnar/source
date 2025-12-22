/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	roots: ['<rootDir>'],
	transform: {
		'^.+.ts(x)?$': 'ts-jest',
	},
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/__tests__/**',
		'!src/**/index.{ts,tsx}',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
	verbose: true,
};
