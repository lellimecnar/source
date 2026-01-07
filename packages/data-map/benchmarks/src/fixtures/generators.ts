import type {
	DeepObjectOptions,
	GeneratorSeeded,
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
