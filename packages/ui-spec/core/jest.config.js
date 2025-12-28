const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/core',
	testMatch: [
		'**/__tests__/**/*.+(ts|tsx|js)',
		'**/*.spec.+(ts|tsx|js)',
		'**/*.test.+(ts|tsx|js)',
	],
	testEnvironment: 'node',
};
