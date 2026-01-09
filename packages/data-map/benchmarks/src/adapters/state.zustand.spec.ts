import { describe, expect, it } from 'vitest';

import { zustandStateAdapter } from './state.zustand.js';

describe('zustandStateAdapter', () => {
	it('should pass smoke test', () => {
		expect(zustandStateAdapter.smokeTest()).toBe(true);
	});

	it('should get and set values', () => {
		const store = zustandStateAdapter.createStore({ a: 1, b: 'hello' });

		expect(store.get('a')).toBe(1);
		expect(store.get('b')).toBe('hello');

		store.set('a', 42);
		expect(store.get('a')).toBe(42);
	});

	it('should support subscriptions', () => {
		const store = zustandStateAdapter.createStore({ count: 0 });
		let callCount = 0;

		const unsub = store.subscribe?.(() => {
			callCount++;
		});

		store.set('count', 1);
		expect(callCount).toBe(1);
		unsub?.();

		// After unsubscribe, should not increment
		store.set('count', 2);
		expect(callCount).toBe(1);
	});

	it('should return snapshot', () => {
		const store = zustandStateAdapter.createStore({ x: 1, y: 2 });
		const snapshot = store.getSnapshot() as Record<string, unknown>;

		expect(snapshot.x).toBe(1);
		expect(snapshot.y).toBe(2);

		// Snapshot should be a copy
		store.set('x', 99);
		expect(snapshot.x).toBe(1);
	});
});
