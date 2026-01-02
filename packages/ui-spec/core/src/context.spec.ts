import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';
import { createUISpecContext } from './context';
import { createUISpecStore } from './store';

describe('UISpecContext', () => {
	it('call() delegates to FunctionRegistry with ctx', () => {
		const store = createUISpecStore({ n: 1 });
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		const ctx = createUISpecContext({ store, functions });

		functions.registerFunction('inc', (c) => {
			const current = (c as any).get('$.n');
			(c as any).set('$.n', Number(current) + 1);
		});

		ctx.call('inc');
		expect(store.get('$.n')).toBe(2);
	});
});
