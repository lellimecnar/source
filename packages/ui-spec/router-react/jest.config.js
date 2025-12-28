const base = require('@lellimecnar/jest-config/jest-preset');

module.exports = {
	...base,
	displayName: '@ui-spec/router-react',
	testEnvironment: 'jsdom',
	testEnvironmentOptions: {
		customExportConditions: ['node', 'node-addons'],
	},
};
