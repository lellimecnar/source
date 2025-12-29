/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
	root: true,
	extends: ['@lellimecnar/eslint-config/node'],
	ignorePatterns: ['dist/', 'coverage/', 'node_modules/', 'bin/'],
	rules: {
		// ui-spec packages currently rely on non-kebab filenames and other patterns.
		// Keep lint signal, but avoid hard failures on stylistic rules.
		'unicorn/filename-case': 'warn',
		eqeqeq: 'warn',
		'no-nested-ternary': 'warn',
		'eslint-comments/require-description': 'warn',
		'@typescript-eslint/no-confusing-void-expression': 'warn',
		'@typescript-eslint/no-implied-eval': 'warn',
		'@typescript-eslint/no-dynamic-delete': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/no-unnecessary-condition': 'warn',
		'@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
	},
};
