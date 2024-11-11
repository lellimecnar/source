/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: [
		...['@vercel/style-guide/eslint/next', './node.js'].map((p) =>
			require.resolve(p),
		),
	],
	rules: {
		'import/no-default-export': 'off',
	},
};
