import { describe, expect, it } from 'vitest';
import { FlatStore } from '@data-map/storage';
import { queryFlat } from '../query.js';

describe('@data-map/path', () => {
	it('queries against FlatStore via nested materialization', () => {
		const store = new FlatStore({
			users: [{ name: 'Alice' }, { name: 'Bob' }],
		});
		const res = queryFlat(store, '$.users[*].name');
		expect(res.values).toEqual(['Alice', 'Bob']);
		expect(res.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});
});
