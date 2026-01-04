module.exports = {
	extends: ['@lellimecnar/eslint-config/node'],
	parserOptions: {
		project: './tsconfig.json',
		tsconfigRootDir: __dirname,
	},
};
