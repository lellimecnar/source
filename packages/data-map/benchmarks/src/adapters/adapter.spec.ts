import { describe, expect, it } from 'vitest';
import { DATASETS } from '../fixtures/index.js';
import { getAllAdapters } from './index.js';

describe('benchmark adapters smoke', () => {
	it('each adapter declares a unique name', () => {
		const adapters = getAllAdapters();
		const names = adapters.map((a) => a.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it('each adapter has a features object', () => {
		const adapters = getAllAdapters();
		adapters.forEach((adapter) => {
			expect(adapter).toHaveProperty('features');
			expect(adapter.features).toHaveProperty('get');
		});
	});

	it('data-map adapter can get from smallObject', () => {
		const adapter = getAllAdapters().find((a) => a.name === '@data-map/core');
		expect(adapter).toBeDefined();
		expect(adapter?.get).toBeDefined();
		if (adapter?.get) {
			const result = adapter.get(DATASETS.smallObject, '/key0');
			expect(result).toBeDefined();
		}
	});

	it('data-map adapter can set on smallObject', () => {
		const adapter = getAllAdapters().find((a) => a.name === '@data-map/core');
		expect(adapter).toBeDefined();
		expect(adapter?.set).toBeDefined();
		if (adapter?.set) {
			const updated = adapter.set(DATASETS.smallObject, '/key0', 999);
			expect(updated).toBeDefined();
		}
	});
});
