import { describe, it, expect } from 'vitest';
import { toJSONPatch, fromJSONPatch } from '../convert.js';
import { applyMergePatchWithTrace } from '../trace.js';

describe('toJSONPatch', () => {
	it('should convert simple set operations', () => {
		const target = { a: 1 };
		const patch = { a: 2, b: 3 };
		const result = toJSONPatch(patch, target);

		expect(result).toEqual([
			{ op: 'replace', path: '/a', value: 2 },
			{ op: 'add', path: '/b', value: 3 },
		]);
	});

	it('should convert delete operations', () => {
		const target = { a: 1, b: 2 };
		const patch = { a: null };
		const result = toJSONPatch(patch, target);

		expect(result).toEqual([{ op: 'remove', path: '/a' }]);
	});

	it('should handle nested objects', () => {
		const target = { a: { b: 1 } };
		const patch = { a: { b: 2, c: 3 } };
		const result = toJSONPatch(patch, target);

		expect(result).toEqual([
			{ op: 'replace', path: '/a/b', value: 2 },
			{ op: 'add', path: '/a/c', value: 3 },
		]);
	});
});

describe('fromJSONPatch', () => {
	it('should convert add/replace operations', () => {
		const ops: any[] = [
			{ op: 'add', path: '/a', value: 1 },
			{ op: 'replace', path: '/b/c', value: 2 },
		];
		const result = fromJSONPatch(ops);

		expect(result).toEqual({
			a: 1,
			b: { c: 2 },
		});
	});

	it('should convert remove operations', () => {
		const ops: any[] = [{ op: 'remove', path: '/a' }];
		const result = fromJSONPatch(ops);

		expect(result).toEqual({
			a: null,
		});
	});
});

describe('applyMergePatchWithTrace', () => {
	it('should return result and trace', () => {
		const target = { a: 1 };
		const patch = { a: 2, b: 3, c: null };
		const { result, trace } = applyMergePatchWithTrace(target, patch);

		expect(result).toEqual({ a: 2, b: 3 });
		expect(trace).toEqual([
			{ type: 'set', path: '/a', value: 2, oldValue: 1 },
			{ type: 'set', path: '/b', value: 3, oldValue: undefined },
		]);
	});
});
