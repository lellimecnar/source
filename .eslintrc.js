/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],

	parserOptions: {
		project: ['./tsconfig.json'],
	},

	ignorePatterns: [
		'./apps/**',
		'./mobile/**',
		'./web/**',
		'./packages/**',
		'!./packages/jsonpath/benchmarks/**',
		'**/dist/**',
		'**/build/**',
		'**/node_modules/**',
	],
};
