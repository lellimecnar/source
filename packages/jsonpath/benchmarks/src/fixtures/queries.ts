export const QUERY_CATEGORIES = {
	basic: {
		singleValue: ['$.store.bicycle.color', '$.store.book[0].title'],
		wildcards: ['$.store.book[*].title', '$.store.*'],
		recursive: ['$..author', '$..price'],
	},
	indexing: {
		indices: ['$.store.book[0]', '$.store.book[-1]'],
		unions: ['$.store.book[0,1,2].title'],
		slices: ['$.store.book[0:3].title'],
	},
	filters: {
		simple: [
			'$.store.book[?(@.price < 10)].title',
			'$.users[?(@.active == true)].name',
		],
		logical: ['$.users[?(@.score >= 80 && @.active == true)].name'],
		arithmetic: ['$.users[?(@.score + 10 > 90)].name'],
	},
} as const;
