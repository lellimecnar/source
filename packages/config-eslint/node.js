/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
	extends: ['@vercel/style-guide/eslint/node', './base.js'].map((p) =>
		require.resolve(p),
	),
};
