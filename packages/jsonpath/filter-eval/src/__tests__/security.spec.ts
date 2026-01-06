import { describe, it, expect } from 'vitest';
import { compileFilter } from '../compiler.js';
import { JSONPathSecurityError } from '@jsonpath/core';

function ctx(currentValue: any) {
	return {
		root: currentValue,
		current: {
			value: currentValue,
			path: [],
			root: currentValue,
		},
	};
}

describe('Security', () => {
	it('rejects __proto__ access', () => {
		const f = compileFilter('@.__proto__');
		expect(() => f(ctx({ a: 1 }))).toThrow(JSONPathSecurityError);
	});

	it('rejects constructor access', () => {
		const f = compileFilter('@.constructor');
		expect(() => f(ctx({ a: 1 }))).toThrow(JSONPathSecurityError);
	});

	it('prevents prototype pollution reads', () => {
		const polluted = Object.create({ evil: true });
		polluted.safe = 1;
		const f = compileFilter('@.evil == true');
		expect(f(ctx(polluted))).toBe(false);
	});
});
