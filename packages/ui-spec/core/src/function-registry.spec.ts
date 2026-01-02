import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';

describe('FunctionRegistry', () => {
	it('registers and calls functions', () => {
		const reg = new FunctionRegistry(createJsonp3FunctionRegistry());

		reg.registerFunction(
			'add',
			(_ctx, a: unknown, b: unknown) => Number(a) + Number(b),
		);

		expect(reg.call('add', {}, 1, 2)).toBe(3);
	});

	it('throws when function missing', () => {
		const reg = new FunctionRegistry(createJsonp3FunctionRegistry());
		expect(() => reg.call('missing', {}, 1)).toThrowError(
			/Function not found|UI-Spec function not found/i,
		);
	});
});
