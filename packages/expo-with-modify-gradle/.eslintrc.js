module.exports = {
	root: true,
	extends: ['@lellimecnar/eslint-config/base'],
	parserOptions: {
		project: null,
	},
	rules: {
		'@typescript-eslint/no-unsafe-argument': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-var-requires': 'off',
	},
};
