import { describe, expect, it } from 'vitest';

import { compilePathPattern } from './compile';

describe('compilePathPattern', () => {
	it('compiles wildcard patterns', () => {
		const pattern = compilePathPattern('$.users[*].name');
		expect(pattern.segments).toEqual([
			{ type: 'static', value: 'users' },
			{ type: 'wildcard' },
			{ type: 'static', value: 'name' },
		]);
		expect(pattern.isSingular).toBe(false);
		expect(pattern.concretePrefixPointer).toBe('/users');
	});

	it('compiles slice patterns', () => {
		const pattern = compilePathPattern('$.items[0:5:2]');
		expect(pattern.segments).toEqual([
			{ type: 'static', value: 'items' },
			{ type: 'slice', start: 0, end: 5, step: 2 },
		]);
	});

	it('caches patterns', () => {
		const a = compilePathPattern('$.users[*].name');
		const b = compilePathPattern('$.users[*].name');
		expect(a).toBe(b);
	});

	it('expand returns empty for non-object data when expecting static segment', () => {
		const pattern = compilePathPattern('$.a.b');
		expect(pattern.expand({ a: 1 })).toEqual([]);
	});
});
