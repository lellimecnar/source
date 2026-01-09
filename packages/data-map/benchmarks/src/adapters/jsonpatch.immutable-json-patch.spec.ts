import { describe, expect, it } from 'vitest';

import { immutableJsonPatchAdapter } from './jsonpatch.immutable-json-patch.js';

describe('immutableJsonPatchAdapter', () => {
	it('should pass smoke test', () => {
		expect(immutableJsonPatchAdapter.smokeTest()).toBe(true);
	});

	it('should apply add operation without mutating original', () => {
		const doc = { a: 1 };
		const { result } = immutableJsonPatchAdapter.applyPatch(doc, [
			{ op: 'add', path: '/b', value: 2 },
		]);
		expect(result).toEqual({ a: 1, b: 2 });
		expect(doc).toEqual({ a: 1 }); // Original unchanged
	});

	it('should apply replace operation', () => {
		const doc = { a: 1 };
		const { result } = immutableJsonPatchAdapter.applyPatch(doc, [
			{ op: 'replace', path: '/a', value: 99 },
		]);
		expect(result).toEqual({ a: 99 });
		expect(doc).toEqual({ a: 1 }); // Original unchanged
	});

	it('should apply remove operation', () => {
		const doc = { a: 1, b: 2 };
		const { result } = immutableJsonPatchAdapter.applyPatch(doc, [
			{ op: 'remove', path: '/b' },
		]);
		expect(result).toEqual({ a: 1 });
		expect(doc).toEqual({ a: 1, b: 2 }); // Original unchanged
	});
});
