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

	it('serializes to JSON via toJSON() (REQ-026)', () => {
		const pattern = compilePathPattern('$.users[?(@.active)].name');
		const json = pattern.toJSON();
		expect(json.source).toBe('$.users[?(@.active)].name');
		expect(json.isSingular).toBe(false);
		expect(json.concretePrefix).toBe('/users');
		expect(json.segments.some((s) => s.type === 'filter')).toBe(true);
	});

	it('toJSON() covers recursive segment serialization', () => {
		const pattern = compilePathPattern('$..name');
		const json = pattern.toJSON();
		expect(json.segments.some((s) => s.type === 'recursive')).toBe(true);
	});

	it('toJSON source round-trips behavior (REQ-026)', () => {
		const p1 = compilePathPattern('$.users[*].name');
		const p2 = compilePathPattern(p1.toJSON().source);
		expect(p2.match('/users/0/name', () => undefined).matches).toBe(true);
	});
});
