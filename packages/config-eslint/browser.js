/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: ['@vercel/style-guide/eslint/browser', './base.js'].map(
		require.resolve,
	),
};
