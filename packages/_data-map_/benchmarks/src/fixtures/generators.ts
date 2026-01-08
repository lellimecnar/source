import type {
	DeepObjectOptions,
	GeneratorSeeded,
	NestedArrayOptions,
	RealisticDataOptions,
	SparseArrayOptions,
	StringHeavyOptions,
	WideArrayOptions,
	WideObjectOptions,
} from './types.js';

export function createSeededRng(seed: number): () => number {
	let s = seed >>> 0;
	return function () {
		s = (s + 0x6d2b79f5) >>> 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randomInt(rng: () => number, min: number, max: number): number {
	return Math.floor(rng() * (max - min + 1)) + min;
}

function randomString(rng: () => number, length: number): string {
	const chars =
		'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars[randomInt(rng, 0, chars.length - 1)];
	}
	return result;
}

function randomEmail(rng: () => number): string {
	return `${randomString(rng, 8)}@${randomString(rng, 6)}.com`;
}

function randomDate(rng: () => number): string {
	const year = randomInt(rng, 2020, 2025);
	const month = String(randomInt(rng, 1, 12)).padStart(2, '0');
	const day = String(randomInt(rng, 1, 28)).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function generateWideObject(
	options: WideObjectOptions,
): Record<string, any> {
	const rng = createSeededRng(options.seed);
	const out: Record<string, any> = {};

	for (let i = 0; i < options.width; i++) {
		const key = `key${i}`;
		if (options.depth > 1) {
			out[key] = generateWideObject({
				width: Math.max(2, Math.floor(options.width / 2)),
				depth: options.depth - 1,
				seed: options.seed + i,
			});
		} else {
			out[key] = randomInt(rng, 0, 1000);
		}
	}
	return out;
}

export function generateDeepObject(options: DeepObjectOptions): any {
	const rng = createSeededRng(options.seed);
	let root: any = { value: randomInt(rng, 0, 1000) };

	for (let i = 0; i < options.depth; i++) {
		root = { nested: root, value: randomInt(rng, 0, 1000) };
	}
	return root;
}

export function generateWideArray(options: WideArrayOptions): any[] {
	const rng = createSeededRng(options.seed);
	const out: any[] = [];

	for (let i = 0; i < options.length; i++) {
		out.push({
			id: i,
			value: randomInt(rng, 0, 1000),
			name: `item${i}`,
		});
	}
	return out;
}

export function generateNestedArrays(options: NestedArrayOptions): any[] {
	const rng = createSeededRng(options.seed);

	function buildLevel(depth: number): any[] {
		const arr: any[] = [];
		for (let i = 0; i < options.itemsPerLevel; i++) {
			if (depth < options.nestingDepth) {
				arr.push({
					id: `${depth}-${i}`,
					children: buildLevel(depth + 1),
					value: randomInt(rng, 0, 1000),
				});
			} else {
				arr.push({
					id: `${depth}-${i}`,
					value: randomInt(rng, 0, 1000),
				});
			}
		}
		return arr;
	}

	return buildLevel(0);
}

export function generateSparseArray(options: SparseArrayOptions): any[] {
	const rng = createSeededRng(options.seed);
	const arr: any[] = new Array(options.length);

	for (let i = 0; i < options.length; i++) {
		if (rng() < options.density) {
			arr[i] = {
				id: i,
				value: randomInt(rng, 0, 1000),
			};
		}
		// Leave gaps for sparse array
	}
	return arr;
}

export function generateStringHeavyData(
	options: StringHeavyOptions,
): Record<string, any> {
	const rng = createSeededRng(options.seed);
	const out: Record<string, any> = {};

	for (let i = 0; i < options.count; i++) {
		out[`field${i}`] = randomString(rng, options.stringLength);
	}
	return out;
}

export function generateNumberHeavyData(
	options: GeneratorSeeded & { count: number },
): Record<string, any> {
	const rng = createSeededRng(options.seed);
	const out: Record<string, any> = {
		integers: [] as number[],
		floats: [] as number[],
		matrix: [] as number[][],
	};

	for (let i = 0; i < options.count; i++) {
		out.integers.push(randomInt(rng, -1000000, 1000000));
		out.floats.push(rng() * 1000000);
	}

	// 10x10 matrix
	for (let i = 0; i < 10; i++) {
		const row: number[] = [];
		for (let j = 0; j < 10; j++) {
			row.push(rng() * 100);
		}
		out.matrix.push(row);
	}

	return out;
}

export function generateMixedData(options: { seed: number }): any {
	const rng = createSeededRng(options.seed);
	return {
		objects: [
			generateWideObject({ width: 5, depth: 2, seed: options.seed + 1 }),
			generateWideObject({ width: 5, depth: 2, seed: options.seed + 2 }),
		],
		deep: generateDeepObject({ depth: 5, seed: options.seed + 3 }),
		array: generateWideArray({ length: 10, seed: options.seed + 4 }),
	};
}

export function generateUserStore(
	options: RealisticDataOptions,
): Record<string, any> {
	const rng = createSeededRng(options.seed);
	const users: Record<string, any> = {};
	const posts: Record<string, any> = {};
	const comments: Record<string, any> = {};

	for (let u = 0; u < options.userCount; u++) {
		const userId = `user_${u}`;
		users[userId] = {
			id: userId,
			name: randomString(rng, 12),
			email: randomEmail(rng),
			createdAt: randomDate(rng),
			profile: {
				bio: randomString(rng, 100),
				avatar: `https://example.com/avatars/${randomString(rng, 8)}.jpg`,
				settings: {
					theme: rng() > 0.5 ? 'dark' : 'light',
					notifications: rng() > 0.3,
					language: ['en', 'es', 'fr', 'de'][randomInt(rng, 0, 3)],
				},
			},
			postIds: [] as string[],
		};

		for (let p = 0; p < options.postsPerUser; p++) {
			const postId = `post_${u}_${p}`;
			users[userId].postIds.push(postId);

			posts[postId] = {
				id: postId,
				authorId: userId,
				title: randomString(rng, 30),
				content: randomString(rng, 200),
				createdAt: randomDate(rng),
				likes: randomInt(rng, 0, 1000),
				commentIds: [] as string[],
			};

			for (let c = 0; c < options.commentsPerPost; c++) {
				const commentId = `comment_${u}_${p}_${c}`;
				posts[postId].commentIds.push(commentId);

				comments[commentId] = {
					id: commentId,
					postId,
					authorId: `user_${randomInt(rng, 0, options.userCount - 1)}`,
					content: randomString(rng, 100),
					createdAt: randomDate(rng),
					likes: randomInt(rng, 0, 100),
				};
			}
		}
	}

	return { users, posts, comments };
}

export function generateTodoApp(
	options: GeneratorSeeded & { listCount: number; todosPerList: number },
): Record<string, any> {
	const rng = createSeededRng(options.seed);
	const lists: any[] = [];

	for (let l = 0; l < options.listCount; l++) {
		const todos: any[] = [];
		for (let t = 0; t < options.todosPerList; t++) {
			todos.push({
				id: `todo_${l}_${t}`,
				title: randomString(rng, 20),
				completed: rng() > 0.6,
				priority: ['low', 'medium', 'high'][randomInt(rng, 0, 2)],
				dueDate: rng() > 0.5 ? randomDate(rng) : null,
				tags: Array.from({ length: randomInt(rng, 0, 3) }, () =>
					randomString(rng, 6),
				),
			});
		}

		lists.push({
			id: `list_${l}`,
			name: randomString(rng, 15),
			color: `#${randomString(rng, 6)}`,
			todos,
		});
	}

	return {
		lists,
		settings: {
			defaultView: 'list',
			sortBy: 'dueDate',
			showCompleted: true,
		},
		user: {
			id: 'current_user',
			name: randomString(rng, 10),
		},
	};
}

export function generateEcommerce(
	options: GeneratorSeeded & { productCount: number; cartSize: number },
): Record<string, any> {
	const rng = createSeededRng(options.seed);
	const products: Record<string, any> = {};
	const cart: any[] = [];

	for (let p = 0; p < options.productCount; p++) {
		const productId = `prod_${p}`;
		products[productId] = {
			id: productId,
			name: randomString(rng, 20),
			description: randomString(rng, 100),
			price: Math.round(rng() * 10000) / 100,
			currency: 'USD',
			inventory: randomInt(rng, 0, 1000),
			categories: Array.from({ length: randomInt(rng, 1, 4) }, () =>
				randomString(rng, 8),
			),
			images: Array.from({ length: randomInt(rng, 1, 5) }, (_, i) => ({
				url: `https://example.com/products/${productId}/${i}.jpg`,
				alt: randomString(rng, 15),
			})),
			variants: Array.from({ length: randomInt(rng, 1, 3) }, () => ({
				size: ['S', 'M', 'L', 'XL'][randomInt(rng, 0, 3)],
				color: randomString(rng, 6),
				sku: randomString(rng, 10),
			})),
		};
	}

	for (let c = 0; c < options.cartSize; c++) {
		cart.push({
			productId: `prod_${randomInt(rng, 0, options.productCount - 1)}`,
			quantity: randomInt(rng, 1, 5),
			variant: {
				size: ['S', 'M', 'L', 'XL'][randomInt(rng, 0, 3)],
				color: randomString(rng, 6),
			},
		});
	}

	return {
		products,
		cart,
		checkout: {
			step: 1,
			shipping: null,
			payment: null,
		},
	};
}
