module.exports = {
	extends: ['@lellimecnar/eslint-config'],
	ignorePatterns: ['!./*.json', '!./*.js', '!./src/**/*'],
	rules: {
		'@typescript-eslint/ban-types': 'warn',
		'@typescript-eslint/no-extraneous-class': 'warn',
		'@typescript-eslint/no-unnecessary-condition': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'func-names': 'warn',
	},
};
