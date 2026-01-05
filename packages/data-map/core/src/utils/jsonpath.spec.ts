import { describe, expect, it } from 'vitest';

import {
	applyOperations,
	DataMapPathError,
	pointerExists,
	queryWithPointers,
	resolvePointer,
	streamQuery,
} from './jsonpath';

describe('utils/jsonpath', () => {
	it('queryWithPointers returns JSON Pointer strings + values', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const result = queryWithPointers(data, '$.users[*].name');
		expect(result.values).toEqual(['A', 'B']);
		expect(result.pointers).toEqual(['/users/0/name', '/users/1/name']);
	});

	it('streamQuery yields pointer + value (+ root)', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const nodes = Array.from(streamQuery(data, '$.users[*].name'));
		expect(nodes.map((n) => n.pointer)).toEqual([
			'/users/0/name',
			'/users/1/name',
		]);
		expect(nodes.map((n) => n.value)).toEqual(['A', 'B']);
		expect(nodes.every((n) => n.root === data)).toBe(true);
	});

	it('resolvePointer resolves root and nested pointers', () => {
		const data: any = { a: { b: [1, 2] } };
		expect(resolvePointer(data, '')).toBe(data);
		expect(resolvePointer(data, '/a/b/1')).toBe(2);
	});

	it('pointerExists distinguishes missing vs present undefined', () => {
		const data: any = { a: { b: undefined }, arr: [undefined] };
		expect(resolvePointer(data, '/a/b')).toBeUndefined();
		expect(pointerExists(data, '/a/b')).toBe(true);
		expect(pointerExists(data, '/a/missing')).toBe(false);
		expect(pointerExists(data, '/arr/0')).toBe(true);
		expect(pointerExists(data, '/arr/1')).toBe(false);
	});

	it('applyOperations is immutable by default', () => {
		const target: any = { a: 1 };
		const next = applyOperations(target, [
			{ op: 'replace', path: '/a', value: 2 },
		]);
		expect(next).toEqual({ a: 2 });
		expect(target).toEqual({ a: 1 });
	});

	it('applyOperations supports mutate=true', () => {
		const target: any = { a: 1 };
		const next = applyOperations(
			target,
			[{ op: 'replace', path: '/a', value: 2 }],
			{ mutate: true },
		);
		expect(next).toBe(target);
		expect(target).toEqual({ a: 2 });
	});

	it('normalizes JSONPath syntax errors to DataMapPathError', () => {
		const data = { a: 1 };
		try {
			queryWithPointers(data, '$[');
			throw new Error('expected throw');
		} catch (err) {
			expect(err).toBeInstanceOf(DataMapPathError);
			const e = err as DataMapPathError;
			expect(e.code).toBe('SYNTAX_ERROR');
			expect(e.path).toBe('$[');
		}
	});

	it('normalizes pointer syntax errors to DataMapPathError', () => {
		const data = { a: 1 };
		try {
			pointerExists(data, 'not-a-pointer');
			throw new Error('expected throw');
		} catch (err) {
			expect(err).toBeInstanceOf(DataMapPathError);
			const e = err as DataMapPathError;
			expect(e.code).toBe('POINTER_ERROR');
			expect(e.path).toBe('not-a-pointer');
		}
	});
});
