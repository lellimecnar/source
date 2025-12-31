import { describe, expect, it } from 'vitest';

import { getByPointer, removeByPointer, setByPointer } from './index';

describe('@jsonpath/pointer', () => {
	it('gets values', () => {
		expect(getByPointer({ a: { b: 1 } }, '/a/b')).toBe(1);
		expect(getByPointer({ a: { b: 1 } }, '/a/missing')).toBeUndefined();
	});

	it('sets values immutably', () => {
		const root = { a: { b: 1 } };
		const next = setByPointer(root, '/a/b', 2) as any;
		expect((root as any).a.b).toBe(1);
		expect(next.a.b).toBe(2);
	});

	it('rejects forbidden segments', () => {
		expect(() => setByPointer({}, '/__proto__/x', 1)).toThrow(
			/Forbidden JSON Pointer segment/,
		);
		expect(() => removeByPointer({}, '/constructor/x')).toThrow(
			/Forbidden JSON Pointer segment/,
		);
	});
});
