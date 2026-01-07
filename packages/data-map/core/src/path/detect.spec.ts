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

	it('is stable across repeated calls (memoization must not change results)', () => {
		const inputs = [
			'',
			'/users/0/name',
			'#/users',
			'#',
			'0',
			'1/foo',
			'2#',
			'$',
			'$.users[*]',
			'$..name',
		] as const;

		for (const input of inputs) {
			const first = detectPathType(input);
			for (let i = 0; i < 50; i++) {
				expect(detectPathType(input)).toBe(first);
			}
		}
	});

	it('remains correct after cache overflow', () => {
		// Must match DETECT_PATH_TYPE_CACHE_MAX_SIZE in detect.ts
		const maxSize = 10_000;

		for (let i = 0; i < maxSize + 50; i++) {
			expect(detectPathType(`$.x${i}`)).toBe('jsonpath');
		}

		expect(detectPathType('')).toBe('pointer');
		expect(detectPathType('/users/0/name')).toBe('pointer');
		expect(detectPathType('#/users')).toBe('pointer');
		expect(detectPathType('#')).toBe('pointer');
		expect(detectPathType('0')).toBe('relative-pointer');
		expect(detectPathType('1/foo')).toBe('relative-pointer');
		expect(detectPathType('2#')).toBe('relative-pointer');
		expect(detectPathType('$')).toBe('jsonpath');
		expect(detectPathType('$..name')).toBe('jsonpath');
	});
});
