/** @type {import('eslint').Linter.Config} */
module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],

	ignorePatterns: ['./apps/**', './packages/**', '**/dist/**', '**/build/**', '**/node_modules/**'],
};
