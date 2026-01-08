import { describe, expect, it, vi } from 'vitest';
import { createDataMap } from '../create.js';

describe('@data-map/core', () => {
	it('get/set via pointers', () => {
		const store = createDataMap({ users: [{ name: 'Alice' }] });
		store.set('/users/0/name', 'Bob');
		expect(store.get('/users/0/name')).toBe('Bob');
	});

	it('subscribe to pointer', async () => {
		const store = createDataMap({});
		const fn = vi.fn();
		store.subscribe('/x', fn);
		store.set('/x', 1);
		await Promise.resolve();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('computedPointer updates after mutation', () => {
		const store = createDataMap({});
		store.set('/x', 1);
		const { computed: c } = store.computedPointer<number>('/x');
		expect(c.value).toBe(1);
		store.set('/x', 2);
		expect(c.value).toBe(2);
	});

	it('query returns pointers', () => {
		const store = createDataMap({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});
		const res = store.query('$.users[*].name');
		expect(res.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});
});
