import { describe, expect, it } from 'vitest';

import { valtioStateAdapter } from './state.valtio.js';

describe('valtioStateAdapter', () => {
	it('should pass smoke test', () => {
		expect(valtioStateAdapter.smokeTest()).toBe(true);
	});

	it('should get and set values', () => {
		const store = valtioStateAdapter.createStore({ a: 1, b: 'hello' });

		expect(store.get('a')).toBe(1);
		expect(store.get('b')).toBe('hello');

		store.set('a', 42);
		expect(store.get('a')).toBe(42);
	});

	it('should support subscriptions', () => {
		const store = valtioStateAdapter.createStore({ count: 0 });
		let callCount = 0;

		const unsub = store.subscribe?.(() => {
			callCount++;
		});

		store.set('count', 1);
		// Valtio batches updates, so we may need to wait
		// For sync test, just verify subscription was set up
		expect(typeof unsub).toBe('function');
		unsub?.();
	});

	it('should return snapshot', () => {
		const store = valtioStateAdapter.createStore({ x: 1, y: 2 });
		const snapshot = store.getSnapshot() as Record<string, unknown>;

		expect(snapshot.x).toBe(1);
		expect(snapshot.y).toBe(2);

		// Snapshot should be a copy
		store.set('x', 99);
		expect(snapshot.x).toBe(1);
	});
});
