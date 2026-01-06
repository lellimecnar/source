import { expect, test } from 'vitest';
import { lellimecnarJsonPathAdapter } from './jsonpath.lellimecnar.js';
import { STORE_DATA } from '../test/store-data.js';

test('@jsonpath/jsonpath adapter: titles', () => {
	expect(
		lellimecnarJsonPathAdapter.queryValues(STORE_DATA, '$.store.book[*].title'),
	).toEqual(['Sayings of the Century', 'Sword of Honour', 'Moby Dick']);
});
