import { expect, test } from 'vitest';
import { lellimecnarPointerAdapter } from './pointer.lellimecnar';
import { STORE_DATA } from '../test/store-data';

test('@jsonpath/pointer adapter: get', () => {
	expect(
		lellimecnarPointerAdapter.get(STORE_DATA, '/store/bicycle/color'),
	).toBe('red');
});
