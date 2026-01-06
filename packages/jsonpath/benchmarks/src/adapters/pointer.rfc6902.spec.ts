import { expect, test } from 'vitest';
import { rfc6902PointerAdapter } from './pointer.rfc6902.js';
import { STORE_DATA } from '../test/store-data.js';

test('rfc6902.Pointer adapter: get', () => {
	expect(rfc6902PointerAdapter.get(STORE_DATA, '/store/bicycle/color')).toBe(
		'red',
	);
});
