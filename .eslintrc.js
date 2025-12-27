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
		'**/dist/**',
		'**/build/**',
		'**/node_modules/**',
	],
};
