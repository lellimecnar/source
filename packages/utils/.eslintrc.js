/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
	extends: ['@lellimecnar/eslint-config'],
	ignorePatterns: ['!./*.json', '!./*.js', '!./src/**/*'],
	parserOptions: {
		project: ['./tsconfig.json'],
	},
};
