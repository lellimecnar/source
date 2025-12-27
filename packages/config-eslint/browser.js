/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
	extends: ['@vercel/style-guide/eslint/browser', './base.js'].map((p) =>
		require.resolve(p),
	),
};
