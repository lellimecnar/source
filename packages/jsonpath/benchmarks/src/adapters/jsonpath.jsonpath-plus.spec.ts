import { expect, test } from 'vitest';
import { jsonpathPlusAdapter } from './jsonpath.jsonpath-plus';
import { STORE_DATA } from '../test/store-data';

test('jsonpath-plus adapter: titles', () => {
	expect(
		jsonpathPlusAdapter.queryValues(STORE_DATA, '$.store.book[*].title'),
	).toEqual(['Sayings of the Century', 'Sword of Honour', 'Moby Dick']);
});
