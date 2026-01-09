import { describe, expect, it } from 'vitest';

import { jsonPointerPathAdapter } from './path.json-pointer.js';

describe('jsonPointerPathAdapter', () => {
	it('should pass smoke test', () => {
		expect(jsonPointerPathAdapter.smokeTest()).toBe(true);
	});

	it('should get values at pointer path', () => {
		const obj = { a: { b: { c: 1 } } };
		expect(jsonPointerPathAdapter.get(obj, '/a')).toEqual({ b: { c: 1 } });
		expect(jsonPointerPathAdapter.get(obj, '/a/b')).toEqual({ c: 1 });
		expect(jsonPointerPathAdapter.get(obj, '/a/b/c')).toBe(1);
	});

	it('should set values at pointer path', () => {
		const obj: Record<string, unknown> = { a: { b: 1 } };
		jsonPointerPathAdapter.set(obj, '/a/b', 99);
		expect((obj.a as Record<string, unknown>).b).toBe(99);
	});

	it('should check if path exists', () => {
		const obj = { a: { b: 1 } };
		expect(jsonPointerPathAdapter.has(obj, '/a/b')).toBe(true);
		expect(jsonPointerPathAdapter.has(obj, '/a/c')).toBe(false);
	});

	it('should delete at path', () => {
		const obj: Record<string, unknown> = { a: { b: 1, c: 2 } };
		jsonPointerPathAdapter.del(obj, '/a/b');
		expect((obj.a as Record<string, unknown>).b).toBeUndefined();
		expect((obj.a as Record<string, unknown>).c).toBe(2);
	});

	it('should handle array indices', () => {
		const obj = { arr: [1, 2, 3] };
		expect(jsonPointerPathAdapter.get(obj, '/arr/1')).toBe(2);
	});
});
