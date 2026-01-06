import { expect, test } from 'vitest';
import { jsonPointerAdapter } from './pointer.json-pointer.js';
import { cloneStoreData } from '../test/store-data.js';

test('json-pointer adapter: get/has/parse/compile', () => {
	const data = cloneStoreData() as unknown as Record<string, unknown>;
	expect(jsonPointerAdapter.get(data, '/store/bicycle/color')).toBe('red');
	expect(jsonPointerAdapter.has?.(data, '/store/bicycle/color')).toBe(true);
	const t = jsonPointerAdapter.parse?.('/store/bicycle/color')!;
	expect(jsonPointerAdapter.compile?.(t)).toBe('/store/bicycle/color');
});
