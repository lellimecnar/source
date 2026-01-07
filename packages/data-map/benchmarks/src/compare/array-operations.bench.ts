/**
 * Array Operations Comparison Benchmarks
 *
 * Compares array mutation operations across adapters.
 * Tests push, pop, shift, unshift, splice, and sort.
 */

import { bench, describe } from 'vitest';

import { getAllAdapters, getAdaptersWithFeature } from '../adapters';
import {
	getPopAdapters,
	getPushAdapters,
	getShiftAdapters,
	getSortAdapters,
	getSpliceAdapters,
	getUnshiftAdapters,
} from '../comparison.js';
import { DATASETS } from '../fixtures';

const allAdapters = getAllAdapters();
const pushAdapters = getPushAdapters(allAdapters);
const popAdapters = getPopAdapters(allAdapters);
const shiftAdapters = getShiftAdapters(allAdapters);
const unshiftAdapters = getUnshiftAdapters(allAdapters);
const spliceAdapters = getSpliceAdapters(allAdapters);
const sortAdapters = getSortAdapters(allAdapters);
const mapAdapters = getAdaptersWithFeature('map');

// Test arrays of different sizes
const smallArray = Array.from({ length: 100 }, (_, i) => ({
	id: i,
	value: `item${i}`,
}));
const mediumArray = Array.from({ length: 1000 }, (_, i) => ({
	id: i,
	value: `item${i}`,
}));
const largeArray = Array.from({ length: 10000 }, (_, i) => ({
	id: i,
	value: `item${i}`,
}));

describe('Array Operations Comparison', () => {
	describe('Push - Single Item', () => {
		describe('Small Array (100)', () => {
			for (const adapter of pushAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(smallArray) };
					adapter.push!(data, '/items', { id: 999, value: 'new' });
				});
			}
		});

		describe('Medium Array (1000)', () => {
			for (const adapter of pushAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(mediumArray) };
					adapter.push!(data, '/items', { id: 999, value: 'new' });
				});
			}
		});

		describe('Large Array (10000)', () => {
			for (const adapter of pushAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(largeArray) };
					adapter.push!(data, '/items', { id: 999, value: 'new' });
				});
			}
		});
	});

	describe('Push - Multiple Items (10)', () => {
		const itemsToAdd = Array.from({ length: 10 }, (_, i) => ({
			id: 1000 + i,
			value: `new${i}`,
		}));

		for (const adapter of pushAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(smallArray) };
				adapter.push!(data, '/items', ...itemsToAdd);
			});
		}
	});

	describe('Pop - Single Item', () => {
		describe('Small Array (100)', () => {
			for (const adapter of popAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(smallArray) };
					adapter.pop!(data, '/items');
				});
			}
		});

		describe('Large Array (10000)', () => {
			for (const adapter of popAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(largeArray) };
					adapter.pop!(data, '/items');
				});
			}
		});
	});

	describe('Shift - Single Item', () => {
		describe('Small Array (100)', () => {
			for (const adapter of shiftAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(smallArray) };
					adapter.shift!(data, '/items');
				});
			}
		});

		describe('Large Array (10000)', () => {
			for (const adapter of shiftAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(largeArray) };
					adapter.shift!(data, '/items');
				});
			}
		});
	});

	describe('Unshift - Single Item', () => {
		describe('Small Array (100)', () => {
			for (const adapter of unshiftAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(smallArray) };
					adapter.unshift!(data, '/items', { id: -1, value: 'first' });
				});
			}
		});

		describe('Large Array (10000)', () => {
			for (const adapter of unshiftAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(largeArray) };
					adapter.unshift!(data, '/items', { id: -1, value: 'first' });
				});
			}
		});
	});

	describe('Unshift - Multiple Items (10)', () => {
		const itemsToAdd = Array.from({ length: 10 }, (_, i) => ({
			id: -(i + 1),
			value: `first${i}`,
		}));

		for (const adapter of unshiftAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(smallArray) };
				adapter.unshift!(data, '/items', ...itemsToAdd);
			});
		}
	});

	describe('Splice - Remove Middle (5 items)', () => {
		describe('Small Array (100)', () => {
			for (const adapter of spliceAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(smallArray) };
					adapter.splice!(data, '/items', 50, 5);
				});
			}
		});

		describe('Large Array (10000)', () => {
			for (const adapter of spliceAdapters) {
				bench(adapter.name, () => {
					const data = { items: structuredClone(largeArray) };
					adapter.splice!(data, '/items', 5000, 5);
				});
			}
		});
	});

	describe('Splice - Insert Middle (5 items)', () => {
		const itemsToInsert = Array.from({ length: 5 }, (_, i) => ({
			id: 2000 + i,
			value: `inserted${i}`,
		}));

		for (const adapter of spliceAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(smallArray) };
				adapter.splice!(data, '/items', 50, 0, ...itemsToInsert);
			});
		}
	});

	describe('Splice - Replace Middle (5 items)', () => {
		const replacements = Array.from({ length: 5 }, (_, i) => ({
			id: 3000 + i,
			value: `replaced${i}`,
		}));

		for (const adapter of spliceAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(smallArray) };
				adapter.splice!(data, '/items', 50, 5, ...replacements);
			});
		}
	});

	describe('Sort - Numeric', () => {
		// Unsorted numeric array
		const unsortedNumeric = Array.from({ length: 100 }, () =>
			Math.floor(Math.random() * 1000),
		);

		for (const adapter of sortAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(unsortedNumeric) };
				adapter.sort!(data, '/items', (a, b) => (a as number) - (b as number));
			});
		}
	});

	describe('Sort - Alphabetic', () => {
		const unsortedStrings = Array.from({ length: 100 }, () =>
			Math.random().toString(36).substring(2, 8),
		);

		for (const adapter of sortAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(unsortedStrings) };
				adapter.sort!(data, '/items', (a, b) =>
					(a as string).localeCompare(b as string),
				);
			});
		}
	});

	describe('Sort - Object by Property', () => {
		const unsortedObjects = Array.from({ length: 100 }, (_, i) => ({
			id: Math.floor(Math.random() * 1000),
			name: `item${i}`,
		}));

		for (const adapter of sortAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(unsortedObjects) };
				adapter.sort!(data, '/items', (a, b) => {
					const aObj = a as { id: number };
					const bObj = b as { id: number };
					return aObj.id - bObj.id;
				});
			});
		}
	});

	describe('Map - Transform Items', () => {
		for (const adapter of mapAdapters) {
			bench(adapter.name, () => {
				const data = { items: structuredClone(smallArray) };
				adapter.map!(data, '/items', (item) => {
					const obj = item as { id: number; value: string };
					return { ...obj, transformed: true };
				});
			});
		}
	});

	describe('Realistic: E-commerce Cart Operations', () => {
		const cart = {
			items: Array.from({ length: 20 }, (_, i) => ({
				productId: `prod_${i}`,
				quantity: Math.floor(Math.random() * 5) + 1,
				price: Math.random() * 100,
			})),
		};

		describe('Add Item to Cart', () => {
			for (const adapter of pushAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(cart);
					adapter.push!(data, '/items', {
						productId: 'prod_new',
						quantity: 1,
						price: 29.99,
					});
				});
			}
		});

		describe('Remove Last Item from Cart', () => {
			for (const adapter of popAdapters) {
				bench(adapter.name, () => {
					const data = structuredClone(cart);
					adapter.pop!(data, '/items');
				});
			}
		});
	});
});
