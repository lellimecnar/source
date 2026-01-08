import { describe, expect, it } from 'vitest';

import { applyOperations } from './apply';

describe('applyOperations', () => {
	it('applies operations to cloned data', () => {
		const input = { a: { b: 1 } };
		const res = applyOperations(input, [
			{ op: 'replace', path: '/a/b', value: 2 },
		]);
		expect(res.nextData).toEqual({ a: { b: 2 } });
		expect(res.nextData).not.toBe(input);
	});

	it('computes affected pointers', () => {
		const res = applyOperations({ a: { b: 1 } }, [
			{ op: 'replace', path: '/a/b', value: 2 },
			{ op: 'add', path: '/a/c', value: 3 },
		]);
		expect([...res.affectedPointers].sort()).toEqual(['/a/b', '/a/c']);
		expect([...res.structuralPointers]).toContain('/a');
	});
});
