import { describe, expect, it } from 'vitest';

import { jotaiStateAdapter } from './state.jotai.js';

describe('jotaiStateAdapter', () => {
	it('should pass smoke test', () => {
		expect(jotaiStateAdapter.smokeTest()).toBe(true);
	});

	it('should get and set values', () => {
		const store = jotaiStateAdapter.createStore({ a: 1, b: 'hello' });

		expect(store.get('a')).toBe(1);
		expect(store.get('b')).toBe('hello');

		store.set('a', 42);
		expect(store.get('a')).toBe(42);
	});

	it('should support subscriptions', () => {
		const store = jotaiStateAdapter.createStore({ count: 0 });
		let callCount = 0;

		const unsub = store.subscribe?.(() => {
			callCount++;
		});

		store.set('count', 1);
		expect(callCount).toBe(1);
		unsub?.();
	});

	it('should return snapshot', () => {
		const store = jotaiStateAdapter.createStore({ x: 1, y: 2 });
		const snapshot = store.getSnapshot() as Record<string, unknown>;

		expect(snapshot.x).toBe(1);
		expect(snapshot.y).toBe(2);
	});
});
