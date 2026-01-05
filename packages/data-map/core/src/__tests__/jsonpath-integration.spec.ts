import { describe, it, expect } from 'vitest';
import {
	jsonpath as p3Jsonpath,
	jsonpatch as p3Jsonpatch,
	JSONPointer as P3JSONPointer,
} from 'json-p3';
import {
	jsonpath as compatJsonpath,
	jsonpatch as compatJsonpatch,
	JSONPointer as CompatJSONPointer,
} from '@jsonpath/compat-json-p3';

describe('json-p3 parity (compat-json-p3)', () => {
	it('query values and pointers match common patterns', () => {
		const data = { users: [{ name: 'A' }, { name: 'B' }] };
		const p3 = p3Jsonpath.query('$.users[*].name', data);
		const compat = compatJsonpath.query('$.users[*].name', data);
		expect(compat.values()).toEqual(p3.values());
		expect(
			compat.pointers().map((p: any) => p.toString?.() ?? String(p)),
		).toEqual(p3.pointers().map((p: any) => p.toString?.() ?? String(p)));
	});

	it('JSONPointer resolve/exists match', () => {
		const data: any = { a: { b: [1, 2] } };
		const p3 = new P3JSONPointer('/a/b/1');
		const compat = new CompatJSONPointer('/a/b/1');
		expect(compat.resolve(data)).toEqual(p3.resolve(data));
		expect(compat.exists(data)).toEqual(p3.exists(data));
	});

	it('jsonpatch.apply mutates in place', () => {
		const ops: any[] = [{ op: 'replace', path: '/a', value: 2 }];
		const t1: any = { a: 1 };
		const t2: any = { a: 1 };
		p3Jsonpatch.apply(ops as any, t1);
		compatJsonpatch.apply(ops as any, t2);
		expect(t2).toEqual(t1);
	});
});
