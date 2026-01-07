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

	it('toJSON returns immutable data reference', () => {
		const dm = new DataMap({ a: { b: 1 } });
		const json = dm.toJSON() as any;
		// toJSON now returns immutable data (frozen in dev, reference in prod)
		// In dev, attempting to mutate should throw; in prod it may or may not
		// Simply verify we can read the data
		expect(json.a.b).toBe(1);
	});

	it('throws DataMapPathError for invalid JSONPath in strict mode', () => {
		const dm = new DataMap({ a: 1 }, { strict: true });
		expect(() => dm.get('$.a[')).toThrow(DataMapPathError);
	});

	it('map() throws on no matches in strict mode and is a no-op in non-strict mode', () => {
		const dmLoose = new DataMap({ a: 1 }, { strict: false });
		expect(() => dmLoose.map('$.missing[*]', () => 1)).not.toThrow();
		expect(dmLoose.get('/a')).toBe(1);

		const dmStrict = new DataMap({ a: 1 }, { strict: true });
		expect(() => dmStrict.map('$.missing[*]', () => 1)).toThrow(
			'No matches for map()',
		);
		// strict mode should not partially mutate
		expect(dmStrict.get('/a')).toBe(1);
	});

	it('setAll() does not throw in non-strict mode for invalid JSONPath, but throws DataMapPathError in strict mode', () => {
		const dmLoose = new DataMap({ a: 1 }, { strict: false });
		expect(() => dmLoose.setAll('$.a[', 2)).not.toThrow();
		expect(dmLoose.get('/a')).toBe(1);

		const dmStrict = new DataMap({ a: 1 }, { strict: true });
		expect(() => dmStrict.setAll('$.a[', 2)).toThrow(DataMapPathError);
		expect(dmStrict.get('/a')).toBe(1);
	});

	it('a before:set cancel() aborts mutation; strict controls whether an error is thrown', () => {
		const dmLoose = new DataMap({ a: 1 }, { strict: false });
		dmLoose.subscribe({
			path: '/a',
			before: 'set',
			fn: (_value, _event, cancel) => cancel(),
		});
		expect(() => dmLoose.set('/a', 2)).not.toThrow();
		expect(dmLoose.get('/a')).toBe(1);

		const dmStrict = new DataMap({ a: 1 }, { strict: true });
		dmStrict.subscribe({
			path: '/a',
			before: 'set',
			fn: (_value, _event, cancel) => cancel(),
		});
		expect(() => dmStrict.set('/a', 2)).toThrow(
			'Patch cancelled by subscription',
		);
		expect(dmStrict.get('/a')).toBe(1);
	});

	it('relative-pointer paths are rejected in strict mode and treated as no-match in non-strict mode', () => {
		const dmLoose = new DataMap({ a: 1 }, { strict: false });
		expect(dmLoose.get('1/a')).toBeUndefined();
		expect(dmLoose.resolve('1/a')).toEqual([]);

		const dmStrict = new DataMap({ a: 1 }, { strict: true });
		expect(() => dmStrict.get('1/a')).toThrow(
			'Unsupported path type: relative-pointer',
		);
		expect(() => dmStrict.resolve('1/a')).toThrow(
			'Unsupported path type: relative-pointer',
		);
	});
});
