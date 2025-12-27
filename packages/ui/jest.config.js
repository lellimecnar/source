module.exports = {
	displayName: '@lellimecnar/ui',
	preset: '@lellimecnar/jest-config/browser',
	testEnvironment: 'jsdom',
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'\\.(css|less|scss|sass)$': 'identity-obj-proxy',
	},
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				tsconfig: {
					jsx: 'react-jsx',
				},
			},
		],
	},
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/**/__tests__/**',
		'!src/**/*.stories.{ts,tsx}',
		'!src/**/index.{ts,tsx}',
	],
	coverageDirectory: 'coverage',
	coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
	coverageThreshold: {
		global: {
			branches: 75,
			functions: 75,
			lines: 75,
			statements: 75,
		},
	},
};
