import { describe, expect, it } from 'vitest';

import { detectPathType } from './detect';

describe('detectPathType', () => {
	it('detects pointer', () => {
		expect(detectPathType('')).toBe('pointer');
		expect(detectPathType('/users/0/name')).toBe('pointer');
		expect(detectPathType('#/users')).toBe('pointer');
		expect(detectPathType('#')).toBe('pointer');
	});

	it('detects relative-pointer', () => {
		expect(detectPathType('0')).toBe('relative-pointer');
		expect(detectPathType('1/foo')).toBe('relative-pointer');
		expect(detectPathType('2#')).toBe('relative-pointer');
	});

	it('detects jsonpath', () => {
		expect(detectPathType('$')).toBe('jsonpath');
		expect(detectPathType('$.users[*]')).toBe('jsonpath');
		expect(detectPathType('$..name')).toBe('jsonpath');
	});
});
