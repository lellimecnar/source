import { createStore } from './store';

describe('createStore', () => {
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
});
