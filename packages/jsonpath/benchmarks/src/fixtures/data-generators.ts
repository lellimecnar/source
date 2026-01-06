export interface LargeArrayItem {
	id: number;
	value: number;
	active: boolean;
	group: string;
	tags: string[];
}

export function generateLargeArray(size: number): LargeArrayItem[] {
	const out: LargeArrayItem[] = [];
	for (let i = 0; i < size; i++) {
		out.push({
			id: i,
			value: i % 10,
			active: i % 3 === 0,
			group: `g${i % 10}`,
			tags: [i % 2 === 0 ? 'even' : 'odd', `mod${i % 5}`],
		});
	}
	return out;
}

export interface DeepNode {
	level: number;
	value: string;
	next?: DeepNode;
}

export function generateDeepObject(depth: number): DeepNode {
	let node: DeepNode = { level: depth, value: `v${depth}` };
	for (let d = depth - 1; d >= 0; d--) {
		node = { level: d, value: `v${d}`, next: node };
	}
	return node;
}

export function generateWideObject(width: number): Record<string, number> {
	const obj: Record<string, number> = {};
	for (let i = 0; i < width; i++) {
		obj[`prop${i}`] = i;
	}
	return obj;
}

export function generateMixedData(): unknown {
	return {
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
				{
					category: 'fiction',
					author: 'Herman Melville',
					title: 'Moby Dick',
					isbn: '0-553',
					price: 8.99,
				},
				{
					category: 'fiction',
					author: 'J. R. R. Tolkien',
					title: 'The Lord',
					isbn: '0-395',
					price: 22.99,
				},
			],
			bicycle: { color: 'red', price: 19.95 },
		},
		users: [
			{ name: 'Sue', score: 100, active: true },
			{ name: 'John', score: 86, active: true },
			{ name: 'Sally', score: 84, active: false },
			{ name: 'Jane', score: 55, active: false },
		],
	};
}
