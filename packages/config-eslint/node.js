/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: ['@vercel/style-guide/eslint/node', './base.js'].map(
		require.resolve,
	),
};
