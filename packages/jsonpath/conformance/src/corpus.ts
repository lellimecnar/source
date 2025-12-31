export type ConformanceProfile =
	| 'rfc9535-draft'
	| 'rfc9535-core'
	| 'rfc9535-full';

export interface ConformanceDocument {
	name: string;
	json: unknown;
}

export interface ConformanceExpectation {
	values?: unknown[];
	pathsOrdered?: string[];
	pathsAnyOrder?: string[];
}

export interface ConformanceCase {
	name: string;
	profile: ConformanceProfile;
	documentName: string;
	query: string;
	expect?: ConformanceExpectation;
}

// Minimal, RFC-flavored documents for early harness wiring.
// NOTE: These are intentionally small. Expand as RFC coverage grows.
export const documents: ConformanceDocument[] = [
	{
		name: 'simple',
		json: { a: { b: 1 }, xs: [1, 2] },
	},
	{
		name: 'rfc-bookstore-mini',
		json: {
			o: { 'j j': 42, k: 1 },
			store: {
				book: [
					{
						category: 'reference',
						author: 'Nigel Rees',
						title: 'Sayings',
						price: 8.95,
					},
					{
						category: 'fiction',
						author: 'Evelyn Waugh',
						title: 'Sword',
						price: 12.99,
					},
				],
			},
		},
	},
];

// Early RFC-targeted cases.
// These are expected to FAIL until PR B+ implements parsing + evaluation.
export const cases: ConformanceCase[] = [
	{
		name: 'rfc: root normalized path ($) (expected to fail until resultType:path exists)',
		profile: 'rfc9535-draft',
		documentName: 'rfc-bookstore-mini',
		query: '$',
		expect: {
			pathsOrdered: ['$'],
		},
	},
	{
		name: 'rfc: root value ($)',
		profile: 'rfc9535-core',
		documentName: 'rfc-bookstore-mini',
		query: '$',
		expect: {
			values: [
				{
					o: { 'j j': 42, k: 1 },
					store: {
						book: [
							{
								category: 'reference',
								author: 'Nigel Rees',
								title: 'Sayings',
								price: 8.95,
							},
							{
								category: 'fiction',
								author: 'Evelyn Waugh',
								title: 'Sword',
								price: 12.99,
							},
						],
					},
				},
			],
		},
	},
	{
		name: 'rfc: child member with space',
		profile: 'rfc9535-core',
		documentName: 'rfc-bookstore-mini',
		query: "$.o['j j']",
		expect: {
			values: [42],
		},
	},
	{
		name: 'rfc: wildcard selector',
		profile: 'rfc9535-core',
		documentName: 'simple',
		query: '$.xs[*]',
		expect: {
			values: [1, 2],
		},
	},
	{
		name: 'rfc: index union',
		profile: 'rfc9535-core',
		documentName: 'simple',
		query: '$.xs[0,-1]',
		expect: {
			values: [1, 2],
		},
	},
	{
		name: 'rfc: descendant name',
		profile: 'rfc9535-core',
		documentName: 'rfc-bookstore-mini',
		query: '$..author',
		expect: {
			values: ['Nigel Rees', 'Evelyn Waugh'],
		},
	},
];
