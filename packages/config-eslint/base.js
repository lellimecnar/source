const project = require('node:path').resolve(process.cwd(), 'tsconfig.json');

/** @type {import('eslint').Linter.Config} */
module.exports = {
	extends: [
		...[
			'@vercel/style-guide/eslint/_base',
			'@vercel/style-guide/eslint/typescript',
		].map(require.resolve),
		'plugin:tailwindcss/recommended',
		'turbo',
	],
	plugins: ['prettier'],
	rules: {
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/restrict-template-expressions': 'warn',
		'no-param-reassign': 'off',
		'prefer-named-capture-group': 'off',
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
	parserOptions: {
		project,
		tsconfigRootDir: process.cwd(),
	},
	overrides: [
		{
			files: ['*.spec.[jt]s?(x)'],
			extends: ['@vercel/style-guide/eslint/jest'].map(require.resolve),
		},
		{
			files: ['*.tsx', '*.jsx'],
			extends: ['@vercel/style-guide/eslint/react'].map(require.resolve),
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
