import { describe, it, expect } from 'vitest';
import { Nothing, isNothing } from '../nothing.js';

describe('Nothing', () => {
	it('is a stable symbol', () => {
		expect(Nothing).toBe(Symbol.for('@jsonpath/nothing'));
	});

	it('type guard works', () => {
		expect(isNothing(Nothing)).toBe(true);
		expect(isNothing(undefined)).toBe(false);
		expect(isNothing(null)).toBe(false);
		expect(isNothing(Symbol('x'))).toBe(false);
	});
});
