import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';
import { createUISpecContext } from './context';
import { resolveAction } from './actions';
import { createUISpecStore } from './store';

describe('resolveAction', () => {
	it('resolves $path args at call time', () => {
		const store = createUISpecStore({ a: 2, b: 3 });
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		const ctx = createUISpecContext({ store, functions });

		functions.registerFunction(
			'sum',
			(_ctx, a: unknown, b: unknown) => Number(a) + Number(b),
		);

		const result = resolveAction(
			{ $call: { id: 'sum', args: [{ $path: '$.a' }, { $path: '$.b' }] } },
			ctx,
		);
		expect(result).toBe(5);
	});
});
