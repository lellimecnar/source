import { describe, expect, it } from 'vitest';

import { dataMapJsonPatchAdapter } from './jsonpatch.data-map.js';

describe('dataMapJsonPatchAdapter', () => {
	it('should pass smoke test', () => {
		expect(dataMapJsonPatchAdapter.smokeTest()).toBe(true);
	});

	it('should apply add operation', () => {
		const doc = { a: 1 };
		const { result } = dataMapJsonPatchAdapter.applyPatch(doc, [
			{ op: 'add', path: '/b', value: 2 },
		]);
		expect(result).toEqual({ a: 1, b: 2 });
		expect(doc).toEqual({ a: 1 }); // Original unchanged
	});

	it('should apply replace operation', () => {
		const doc = { a: 1 };
		const { result } = dataMapJsonPatchAdapter.applyPatch(doc, [
			{ op: 'replace', path: '/a', value: 99 },
		]);
		expect(result).toEqual({ a: 99 });
	});

	it('should apply remove operation', () => {
		const doc = { a: 1, b: 2 };
		const { result } = dataMapJsonPatchAdapter.applyPatch(doc, [
			{ op: 'remove', path: '/b' },
		]);
		expect(result).toEqual({ a: 1 });
	});

	it('should apply move operation', () => {
		const doc = { a: 1, b: { c: 2 } };
		const { result } = dataMapJsonPatchAdapter.applyPatch(doc, [
			{ op: 'move', from: '/b/c', path: '/d' },
		]);
		// Note: data-map uses flat storage, so empty parent objects don't persist
		// after their children are moved/deleted. This differs from RFC 6902 semantics.
		expect(result).toEqual({ a: 1, d: 2 });
	});

	it('should apply copy operation', () => {
		const doc = { a: { x: 1 } };
		const { result } = dataMapJsonPatchAdapter.applyPatch(doc, [
			{ op: 'copy', from: '/a', path: '/b' },
		]);
		expect(result).toEqual({ a: { x: 1 }, b: { x: 1 } });
	});

	it('should apply test operation', () => {
		const doc = { a: 1 };
		const { error } = dataMapJsonPatchAdapter.applyPatch(doc, [
			{ op: 'test', path: '/a', value: 1 },
		]);
		expect(error).toBeUndefined();

		const { error: error2 } = dataMapJsonPatchAdapter.applyPatch(doc, [
			{ op: 'test', path: '/a', value: 999 },
		]);
		expect(error2).toBeDefined();
	});
});
