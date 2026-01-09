import { describe, expect, it } from 'vitest';

import { rfc6902Adapter } from './jsonpatch.rfc6902.js';

describe('rfc6902Adapter', () => {
	it('should pass smoke test', () => {
		expect(rfc6902Adapter.smokeTest()).toBe(true);
	});

	it('should apply add operation', () => {
		const doc = { a: 1 };
		const { result } = rfc6902Adapter.applyPatch(doc, [
			{ op: 'add', path: '/b', value: 2 },
		]);
		expect(result).toEqual({ a: 1, b: 2 });
	});

	it('should apply replace operation', () => {
		const doc = { a: 1 };
		const { result } = rfc6902Adapter.applyPatch(doc, [
			{ op: 'replace', path: '/a', value: 99 },
		]);
		expect(result).toEqual({ a: 99 });
	});

	it('should apply remove operation', () => {
		const doc = { a: 1, b: 2 };
		const { result } = rfc6902Adapter.applyPatch(doc, [
			{ op: 'remove', path: '/b' },
		]);
		expect(result).toEqual({ a: 1 });
	});

	it('should generate patch', () => {
		const from = { a: 1 };
		const to = { a: 2, b: 3 };
		const patch = rfc6902Adapter.generatePatch?.(from, to);
		expect(patch).toBeDefined();
		expect(patch?.length).toBeGreaterThan(0);
	});
});
