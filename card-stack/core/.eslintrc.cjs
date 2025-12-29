module.exports = {
	extends: ['@lellimecnar/eslint-config'],
	ignorePatterns: ['!./*.json', '!./*.js', '!./src/**/*'],
	rules: {
		'import/no-cycle': 'warn',
		'@typescript-eslint/no-shadow': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/no-unused-vars': 'warn',
		'@typescript-eslint/no-useless-constructor': 'warn',
		'@typescript-eslint/restrict-plus-operands': 'warn',
	},
};
