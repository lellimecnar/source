export type ConformanceDocument = {
	name: string;
	json: unknown;
};

export type ConformanceCase = {
	name: string;
	path: string;
};

export const documents: ConformanceDocument[] = [
	{ name: 'simple', json: { a: { b: 1 }, xs: [1, 2] } },
];

export const cases: ConformanceCase[] = [
	{ name: 'child member', path: '$.a.b' },
	{ name: 'array wildcard', path: '$.xs[*]' },
];
