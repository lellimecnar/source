import { describe, expect, it } from 'vitest';

import {
	buildPointer,
	escapePointerSegment,
	parsePointerSegments,
	unescapePointerSegment,
} from './pointer';

describe('pointer utils', () => {
	it('escapes and unescapes', () => {
		expect(escapePointerSegment('a~b')).toBe('a~0b');
		expect(escapePointerSegment('a/b')).toBe('a~1b');
		expect(unescapePointerSegment('a~0~1b')).toBe('a~/b');
	});

	it('parses pointers', () => {
		expect(parsePointerSegments('')).toEqual([]);
		expect(parsePointerSegments('#')).toEqual([]);
		expect(parsePointerSegments('/')).toEqual(['']);
		expect(parsePointerSegments('/users/0/name')).toEqual([
			'users',
			'0',
			'name',
		]);
		expect(parsePointerSegments('#/users')).toEqual(['users']);
		expect(parsePointerSegments('#/a~1b')).toEqual(['a/b']);
	});

	it('builds pointers', () => {
		expect(buildPointer([])).toBe('');
		expect(buildPointer(['users', '0', 'name'])).toBe('/users/0/name');
		expect(buildPointer(['a/b'])).toBe('/a~1b');
	});

	it('roundtrips fragment pointers to non-fragment', () => {
		const pointers = ['', '/', '/users/0/name', '#/users', '#/a~1b'];
		for (const p of pointers) {
			const expected = p.startsWith('#/') ? p.slice(1) : p;
			expect(buildPointer(parsePointerSegments(p))).toBe(expected);
		}
	});
});
