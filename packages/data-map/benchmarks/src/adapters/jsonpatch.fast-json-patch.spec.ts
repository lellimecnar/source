import { describe, expect, it } from 'vitest';

import { fastJsonPatchAdapter } from './jsonpatch.fast-json-patch.js';

describe('fastJsonPatchAdapter', () => {
	it('should pass smoke test', () => {
		expect(fastJsonPatchAdapter.smokeTest()).toBe(true);
	});

	it('should apply add operation', () => {
		const doc = { a: 1 };
		const { result } = fastJsonPatchAdapter.applyPatch(doc, [
			{ op: 'add', path: '/b', value: 2 },
		]);
		expect(result).toEqual({ a: 1, b: 2 });
	});

	it('should apply replace operation', () => {
		const doc = { a: 1 };
		const { result } = fastJsonPatchAdapter.applyPatch(doc, [
			{ op: 'replace', path: '/a', value: 99 },
		]);
		expect(result).toEqual({ a: 99 });
	});

	it('should apply remove operation', () => {
		const doc = { a: 1, b: 2 };
		const { result } = fastJsonPatchAdapter.applyPatch(doc, [
			{ op: 'remove', path: '/b' },
		]);
		expect(result).toEqual({ a: 1 });
	});

	it('should generate patch', () => {
		const from = { a: 1 };
		const to = { a: 2, b: 3 };
		const patch = fastJsonPatchAdapter.generatePatch?.(from, to);
		expect(patch).toBeDefined();
		expect(patch?.length).toBeGreaterThan(0);
	});
});
