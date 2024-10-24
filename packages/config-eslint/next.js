/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: [
		...['@vercel/style-guide/eslint/next', './node.js'].map(require.resolve),
	],
	rules: {
		'import/no-default-export': 'off',
	},
};
