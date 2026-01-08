/**
 * Scale Testing Benchmarks
 *
 * Tests performance at different data scales to understand scaling characteristics.
 * Helps identify algorithms that degrade at scale.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters } from '../adapters';
import {
	getAccessAdapters,
	getCloneAdapters,
	getMutationAdapters,
} from '../comparison.js';
import { BENCHMARK_DATASETS, DATASETS } from '../fixtures';
import {
	generateDeepObject,
	generateWideObject,
} from '../fixtures/generators.js';

const allAdapters = getAllAdapters();
const accessAdapters = getAccessAdapters(allAdapters);
const mutationAdapters = getMutationAdapters(allAdapters);
const cloneAdapters = getCloneAdapters(allAdapters);

// Helper to generate objects of specific key count
function generateObjectOfSize(keyCount: number): Record<string, unknown> {
	return generateWideObject({ width: keyCount, depth: 1, seed: keyCount });
}

// Generate objects of increasing sizes
const obj10 = generateObjectOfSize(10);
const obj100 = generateObjectOfSize(100);
const obj1000 = generateObjectOfSize(1000);
const obj10000 = generateObjectOfSize(10000);

// Nested objects of increasing depth
const depth3 = generateDeepObject({ depth: 3, seed: 3 });
const depth5 = generateDeepObject({ depth: 5, seed: 5 });
const depth10 = generateDeepObject({ depth: 10, seed: 10 });
const depth15 = generateDeepObject({ depth: 15, seed: 15 });
const depth20 = generateDeepObject({ depth: 20, seed: 20 });

// Arrays of increasing sizes
const array10 = Array.from({ length: 10 }, (_, i) => ({
	id: i,
	value: `item${i}`,
}));
const array100 = Array.from({ length: 100 }, (_, i) => ({
	id: i,
	value: `item${i}`,
}));
const array1000 = Array.from({ length: 1000 }, (_, i) => ({
	id: i,
	value: `item${i}`,
}));
const array10000 = Array.from({ length: 10000 }, (_, i) => ({
	id: i,
	value: `item${i}`,
}));

describe('Scale Testing', () => {
	describe('Object Size Scaling - Path Access', () => {
		describe('10 keys', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(obj10, '/key5');
				});
			}
		});

		describe('100 keys', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(obj100, '/key50');
				});
			}
		});

		describe('1,000 keys', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(obj1000, '/key500');
				});
			}
		});

		describe('10,000 keys', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(obj10000, '/key5000');
				});
			}
		});
	});

	describe('Nesting Depth Scaling - Path Access', () => {
		describe('Depth 3', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(depth3, '/level0/level1/level2');
				});
			}
		});

		describe('Depth 5', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(depth5, '/level0/level1/level2/level3/level4');
				});
			}
		});

		describe('Depth 10', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(
						depth10,
						'/level0/level1/level2/level3/level4/level5/level6/level7/level8/level9',
					);
				});
			}
		});

		describe('Depth 15', () => {
			const path = Array.from({ length: 15 }, (_, i) => `level${i}`).join('/');
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(depth15, `/${path}`);
				});
			}
		});

		describe('Depth 20', () => {
			const path = Array.from({ length: 20 }, (_, i) => `level${i}`).join('/');
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(depth20, `/${path}`);
				});
			}
		});
	});

	describe('Object Size Scaling - Mutation', () => {
		/**
		 * Measures: adapter mutation cost (single set) on pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		describe('10 keys', () => {
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(obj10),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					adapter.set!(data, '/key5', 'updated');
				});
			}
		});

		describe('100 keys', () => {
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(obj100),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					adapter.set!(data, '/key50', 'updated');
				});
			}
		});

		describe('1,000 keys', () => {
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(obj1000),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					adapter.set!(data, '/key500', 'updated');
				});
			}
		});

		describe('10,000 keys', () => {
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(obj10000),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					adapter.set!(data, '/key5000', 'updated');
				});
			}
		});
	});

	describe('Nesting Depth Scaling - Mutation', () => {
		/**
		 * Measures: adapter mutation cost (single set) on pre-cloned inputs.
		 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
		 */
		describe('Depth 3', () => {
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(depth3),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					adapter.set!(data, '/level0/level1/level2', 'updated');
				});
			}
		});

		describe('Depth 10', () => {
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(depth10),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					adapter.set!(
						data,
						'/level0/level1/level2/level3/level4/level5/level6/level7/level8/level9',
						'updated',
					);
				});
			}
		});

		describe('Depth 20', () => {
			const path = Array.from({ length: 20 }, (_, i) => `level${i}`).join('/');
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(depth20),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					adapter.set!(data, `/${path}`, 'updated');
				});
			}
		});
	});

	describe('Object Size Scaling - Clone', () => {
		describe('10 keys', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!(obj10);
				});
			}
		});

		describe('100 keys', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!(obj100);
				});
			}
		});

		describe('1,000 keys', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!(obj1000);
				});
			}
		});

		describe('10,000 keys', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!(obj10000);
				});
			}
		});
	});

	describe('Array Size Scaling - Access', () => {
		describe('10 items - First', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!({ items: array10 }, '/items/0');
				});
			}
		});

		describe('10 items - Last', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!({ items: array10 }, '/items/9');
				});
			}
		});

		describe('1,000 items - First', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!({ items: array1000 }, '/items/0');
				});
			}
		});

		describe('1,000 items - Middle', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!({ items: array1000 }, '/items/500');
				});
			}
		});

		describe('1,000 items - Last', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!({ items: array1000 }, '/items/999');
				});
			}
		});

		describe('10,000 items - Last', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!({ items: array10000 }, '/items/9999');
				});
			}
		});
	});

	describe('Array Size Scaling - Clone', () => {
		describe('10 items', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!({ items: array10 });
				});
			}
		});

		describe('100 items', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!({ items: array100 });
				});
			}
		});

		describe('1,000 items', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!({ items: array1000 });
				});
			}
		});

		describe('10,000 items', () => {
			for (const adapter of cloneAdapters) {
				bench(adapter.name, () => {
					adapter.clone!({ items: array10000 });
				});
			}
		});
	});

	describe('Throughput - Sequential Operations', () => {
		describe('100 gets', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					for (let i = 0; i < 100; i++) {
						adapter.get!(obj100, `/key${i}`);
					}
				});
			}
		});

		describe('100 sets', () => {
			/**
			 * Measures: throughput of 100 sequential set operations on pre-cloned inputs.
			 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
			 */
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(obj100),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					for (let i = 0; i < 100; i++) {
						adapter.set!(data, `/key${i}`, `updated${i}`);
					}
				});
			}
		});

		describe('1000 gets', () => {
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					for (let i = 0; i < 1000; i++) {
						adapter.get!(obj1000, `/key${i}`);
					}
				});
			}
		});
	});

	describe('Memory Pressure - Large Object Manipulation', () => {
		describe('Create and mutate large object', () => {
			/**
			 * Measures: repeated mutation cost on pre-cloned inputs.
			 * Excludes: structuredClone cost (performed once per pool slot, outside the timed callback).
			 */
			const dataPool = Array.from({ length: 100 }, () =>
				structuredClone(obj10000),
			);
			let poolIndex = 0;
			for (const adapter of mutationAdapters) {
				bench(adapter.name, () => {
					const data = dataPool[poolIndex++ % dataPool.length];
					for (let i = 0; i < 100; i++) {
						adapter.set!(data, `/key${i * 100}`, { mutated: true, index: i });
					}
				});
			}
		});

		describe('Clone and mutate large object', () => {
			for (const adapter of cloneAdapters) {
				if (!adapter.set) continue;
				bench(adapter.name, () => {
					const cloned = adapter.clone!(obj10000) as Record<string, unknown>;
					for (let i = 0; i < 10; i++) {
						adapter.set!(cloned, `/key${i * 1000}`, {
							mutated: true,
							index: i,
						});
					}
				});
			}
		});
	});

	describe('Edge Cases', () => {
		describe('Empty Object', () => {
			const empty = {};
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(empty, '/nonexistent');
				});
			}
		});

		describe('Deeply Nested Single Path', () => {
			// Create a very deep but narrow object
			let obj: Record<string, unknown> = { value: 'found' };
			for (let i = 0; i < 50; i++) {
				obj = { nested: obj };
			}
			const path = `/${Array.from({ length: 50 }, () => 'nested').join(
				'/',
			)}/value`;

			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(obj, path);
				});
			}
		});

		describe('Wide but Shallow Object', () => {
			// 10000 keys at root level
			for (const adapter of accessAdapters) {
				bench(adapter.name, () => {
					adapter.get!(obj10000, '/key9999');
				});
			}
		});
	});
});
