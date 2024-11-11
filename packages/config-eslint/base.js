const { resolve, dirname } = require('node:path');

const project = resolve(process.cwd(), 'tsconfig.json');
const tsconfigRootDir = dirname(project);

/** @type {import('eslint').Linter.Config} */
module.exports = {
	extends: [
		...[
			'@vercel/style-guide/eslint/_base',
			'@vercel/style-guide/eslint/typescript',
		].map((p) => require.resolve(p)),
		'plugin:tailwindcss/recommended',
		'turbo',
	],
	plugins: ['prettier'],
	rules: {
		'@typescript-eslint/no-unsafe-declaration-merging': 'warn',
		'@typescript-eslint/no-empty-interface': 'warn',
		'@typescript-eslint/no-non-null-assertion': 'warn',
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/restrict-template-expressions': 'warn',
		'@typescript-eslint/no-explicit-any': 'warn',
		'no-param-reassign': 'off',
		'prefer-named-capture-group': 'off',
		'no-bitwise': 'off',
		'import/exports-last': 'off',
		'import/first': 'error',
		'import/no-deprecated': 'error',
		'import/no-default-export': 'off',
		// 'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
		'import/newline-after-import': [
			'error',
			{
				considerComments: true,
			},
		],
		'import/no-useless-path-segments': [
			'error',
			{
				noUselessIndex: true,
			},
		],
		'import/order': [
			'error',
			{
				'newlines-between': 'always',
				distinctGroup: true,
				pathGroups: [
					{
						pattern: '*.css',
						group: 'index',
						position: 'after',
					},
					{
						pattern: '@/**',
						group: 'internal',
						position: 'after',
					},
				],
				groups: [
					['builtin', 'external'],
					'internal',
					['parent', 'sibling', 'index'],
				],
				alphabetize: {
					order: 'asc',
					caseInsensitive: true,
					orderImportKind: 'asc',
				},
			},
		],
		'prettier/prettier': 'error',
	},
	overrides: [
		{
			files: ['*.spec.[jt]s?(x)'],
			extends: ['@vercel/style-guide/eslint/jest'].map((p) =>
				require.resolve(p),
			),
		},
		{
			files: ['*.tsx', '*.jsx'],
			extends: ['@vercel/style-guide/eslint/react'].map((p) =>
				require.resolve(p),
			),
		},
		{
			files: ['*.[jt]s?(x)'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				project,
				tsconfigRootDir,
			},
		},
	],
	settings: {
		'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
		'import/resolver': {
			typescript: {
				project,
			},
			node: {
				extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx'],
			},
		},
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts', '.tsx'],
		},
		'import/internal-regex': '^@lellimecnar/',
	},
	ignorePatterns: ['node_modules/', 'dist/'],
};
