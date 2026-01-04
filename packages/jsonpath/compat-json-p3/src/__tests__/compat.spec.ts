import { describe, it, expect } from 'vitest';
import { jsonpath, jsonpatch, JSONPointer } from '../index.js';
import { query } from '@jsonpath/jsonpath';

describe('@jsonpath/compat-json-p3', () => {
	it('jsonpath.query() matches facade.query() values', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const compat = jsonpath.query('$.users[*].name', data);
		const native = query(data, '$.users[*].name');
		expect(compat.values()).toEqual(native.values());
	});

	it('jsonpatch.apply() mutates target', () => {
		const target: any = { a: 1 };
		jsonpatch.apply([{ op: 'replace', path: '/a', value: 2 } as any], target);
		expect(target).toEqual({ a: 2 });
	});

	it('re-exports JSONPointer', () => {
		const ptr = new JSONPointer('/a');
		expect(ptr.resolve({ a: 1 })).toBe(1);
	});
});
