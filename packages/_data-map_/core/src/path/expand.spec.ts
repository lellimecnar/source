import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('CompiledPathPattern.expand (non-recursive)', () => {
	it('expands wildcard patterns', () => {
		const pattern = compilePathPattern('$.users[*].name');
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		expect(pattern.expand(data).sort()).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
	});

	it('expands slice patterns', () => {
		const pattern = compilePathPattern('$.items[0:5:2]');
		const data = { items: [0, 1, 2, 3, 4, 5] };
		expect(pattern.expand(data).sort()).toEqual([
			'/items/0',
			'/items/2',
			'/items/4',
		]);
	});
});
