import { describe, expect, it } from 'vitest';

import { plugin, validateAll } from './index';

describe('@jsonpath/plugin-validate (additional)', () => {
	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-validate');
		expect(plugin.meta.capabilities).toContain('validate');
	});

	it('returns empty array for empty input', () => {
		const adapter = { id: 'x', validate: () => [] };
		expect(validateAll([], adapter)).toEqual([]);
	});

	it('aggregates issues from all values', () => {
		const adapter = {
			id: 'x',
			validate: (v: unknown) => (v === 1 ? [{ message: 'one' }] : []),
		};
		expect(validateAll([0, 1, 2], adapter)).toEqual([{ message: 'one' }]);
	});

	it('flattens multiple issues per value', () => {
		const adapter = {
			id: 'x',
			validate: () => [{ message: 'a' }, { message: 'b' }],
		};
		expect(validateAll([1], adapter)).toEqual([
			{ message: 'a' },
			{ message: 'b' },
		]);
	});

	it('preserves per-value issue ordering', () => {
		const adapter = {
			id: 'x',
			validate: (v: unknown) => [
				{ message: String(v) + ':1' },
				{ message: String(v) + ':2' },
			],
		};
		expect(validateAll(['a', 'b'], adapter).map((i) => i.message)).toEqual([
			'a:1',
			'a:2',
			'b:1',
			'b:2',
		]);
	});
});
