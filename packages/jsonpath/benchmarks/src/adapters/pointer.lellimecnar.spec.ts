import { expect, test } from 'vitest';
import { lellimecnarPointerAdapter } from './pointer.lellimecnar.js';
import { STORE_DATA } from '../test/store-data.js';

test('@jsonpath/pointer adapter: get', () => {
	expect(
		lellimecnarPointerAdapter.get(STORE_DATA, '/store/bicycle/color'),
	).toBe('red');
});
