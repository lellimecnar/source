import { expect, test } from 'vitest';
import { jsonpathAdapter } from './jsonpath.jsonpath';
import { STORE_DATA } from '../test/store-data';

test('jsonpath adapter: titles', () => {
	expect(
		jsonpathAdapter.queryValues(STORE_DATA, '$.store.book[*].title'),
	).toEqual(['Sayings of the Century', 'Sword of Honour', 'Moby Dick']);
});
