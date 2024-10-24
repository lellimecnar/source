/** @type {import('prettier').Config} */
module.exports = {
	...require('@vercel/style-guide/prettier'),
	useTabs: true,
	// plugins: [
	// 	'prettier-plugin-organize-imports',
	// 	'@trivago/prettier-plugin-sort-imports',
	// 	'prettier-plugin-packagejson',
	// 	'prettier-plugin-jsdoc',
	// 	'prettier-plugin-tailwindcss',
	// ].map(require.resolve),
	// importOrder: [
	// 	'^server-only$',
	// 	'<THIRD_PARTY_MODULES>',
	// 	'^@lellimecnar/(.*)$',
	// 	'^@/(.*)$',
	// 	'^[./]+(.*)$',
	// ],
	// importOrderSeparation: true,
	// importOrderSortSpecifiers: true,
	// importOrderGroupNamespaceSpecifiers: true,
	// importOrderCaseInsensitive: true,
	// jsdocSeparateReturnsFromParam: true,
	// jsdocPreferCodeFences: true,
	// tailwindFunctions: ['cn', 'clsx', 'cva'],
};
