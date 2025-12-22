/** @type {import('eslint').Linter.Config} */
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],

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
