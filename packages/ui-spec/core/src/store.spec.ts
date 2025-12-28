import { createStore } from './store';

describe('createStore (v1)', () => {
	it('reads JSONPath values', () => {
		const store = createStore({ user: { name: 'Ada' } });
		expect(store.get('$.user.name')).toBe('Ada');
	});

	it('notifies subscribers on setData', () => {
		const store = createStore({ count: 0 });
		const listener = jest.fn();

		const unsubscribe = store.subscribe(listener);
		store.setData({ count: 1 });

		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();
		store.setData({ count: 2 });
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it('applies JSONPath writes to all matches (stable order)', () => {
		const store = createStore({ users: [{ active: true }, { active: true }] });
		const result = store.set('$.users[*].active', false);

		expect(result.matched).toBe(2);
		expect(result.changed).toBe(2);
		expect(store.get('$.users[0].active')).toBe(false);
		expect(store.get('$.users[1].active')).toBe(false);
	});
});
