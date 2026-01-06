import { expect, test } from 'vitest';
import { fastJsonPatchPointerAdapter } from './pointer.fast-json-patch';
import { STORE_DATA } from '../test/store-data';

test('fast-json-patch pointer adapter: get', () => {
	expect(
		fastJsonPatchPointerAdapter.get(STORE_DATA, '/store/bicycle/color'),
	).toBe('red');
});
