import { describe, it, expect } from 'vitest';
import { compileFilter } from '../compiler.js';

function ctx(currentValue: any) {
	return {
		root: { items: [currentValue] },
		current: {
			value: currentValue,
			path: [],
			root: { items: [currentValue] },
		},
	};
}

describe('FilterEvaluator', () => {
	it('evaluates simple comparisons', () => {
		const f = compileFilter('@.a == 1');
		expect(f(ctx({ a: 1 }))).toBe(true);
		expect(f(ctx({ a: 2 }))).toBe(false);
	});

	it('handles logical operators', () => {
		const f = compileFilter('@.a == 1 || @.b == 2');
		expect(f(ctx({ a: 1, b: 0 }))).toBe(true);
		expect(f(ctx({ a: 0, b: 2 }))).toBe(true);
		expect(f(ctx({ a: 0, b: 0 }))).toBe(false);
	});

	it('supports built-in functions (length)', () => {
		const f = compileFilter('length(@.s) == 3');
		expect(f(ctx({ s: 'hey' }))).toBe(true);
	});
});
