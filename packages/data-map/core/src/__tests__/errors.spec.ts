import { describe, expect, it } from 'vitest';

import { DataMap } from '../datamap';
import { DataMapPathError } from '../utils/jsonpath';
import { flushMicrotasks } from '../__fixtures__/helpers';

describe('error and negative cases', () => {
	it('handles get() with empty path as root pointer', () => {
		const dm = new DataMap({ a: 1 });
		expect(dm.get('')).toEqual({ a: 1 });
		expect(dm.get('#')).toEqual({ a: 1 });
	});

	it('returns undefined for non-existent nested path (non-strict)', () => {
		const dm = new DataMap({ a: { b: 1 } });
		expect(dm.get('/a/b/c/d')).toBeUndefined();
	});

	it('throws for non-existent path in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('/missing')).toThrow();
	});

	it('handles patch on non-existent path in non-strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: false });
		// Should not throw
		dm.patch([{ op: 'add', path: '/new', value: 2 }]);
		expect(dm.get('/new')).toBe(2);
	});

	it('handles resolve() with fragment pointer', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const matches = dm.resolve('#/a/b');
		expect(matches).toHaveLength(1);
		expect(matches[0]!.value).toBe(1);
	});

	it('handles JSONPath with no matches gracefully', () => {
		const dm = new DataMap({ items: [] });
		expect(dm.getAll('$.items[*].name')).toEqual([]);
	});

	it('subscription handler error does not prevent patch application', async () => {
		const dm = new DataMap({ a: 1 });
		dm.subscribe({
			path: '/a',
			after: 'patch',
			fn: () => {
				throw new Error('handler error');
			},
		});

		// Patch should still apply
		expect(() =>
			dm.patch([{ op: 'replace', path: '/a', value: 2 }]),
		).not.toThrow();
		await flushMicrotasks();
		expect(dm.get('/a')).toBe(2);
	});

	it('toJSON returns cloned data', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const json = dm.toJSON() as any;
		json.a.b = 999;
		expect(dm.get('/a/b')).toBe(1);
	});

	it('throws DataMapPathError for invalid JSONPath in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('$.a[')).toThrow(DataMapPathError);
	});
});
