/** @type {import("eslint").Linter.Config} */
module.exports = {
	extends: ['@vercel/style-guide/eslint/browser', './base.js'].map((p) =>
		require.resolve(p),
	),
};
