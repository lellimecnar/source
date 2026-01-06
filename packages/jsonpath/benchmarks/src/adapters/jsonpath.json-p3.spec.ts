import { expect, test } from 'vitest';
import { jsonP3Adapter } from './jsonpath.json-p3';
import { STORE_DATA } from '../test/store-data';

test('json-p3 adapter: titles', () => {
	expect(
		jsonP3Adapter.queryValues(STORE_DATA, '$.store.book[*].title'),
	).toEqual(['Sayings of the Century', 'Sword of Honour', 'Moby Dick']);
});
