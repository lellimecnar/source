export const vectors = [
	{
		name: 'simple literal match (full)',
		pattern: 'abc',
		value: 'abc',
		entire: true,
		search: true,
	},
	{
		name: 'simple literal mismatch (full)',
		pattern: 'abc',
		value: 'ab',
		entire: false,
		search: false,
	},
	{
		name: 'unicode property escape',
		pattern: '\\p{L}+',
		value: 'Éclair',
		entire: true,
		search: true,
	},
	{
		name: 'invalid pattern rejected',
		pattern: '(',
		value: 'x',
		entire: false,
		search: false,
		invalid: true,
	},
] as const;
