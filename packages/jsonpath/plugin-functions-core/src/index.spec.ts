import { describe, expect, it } from 'vitest';

import { FunctionRegistry, plugin } from './index';

describe('@jsonpath/plugin-functions-core', () => {
	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-functions-core');
		expect(plugin.meta.capabilities).toEqual(['functions:rfc9535:core']);
	});

	it('registers and resolves functions', () => {
		const r = new FunctionRegistry();
		r.register('len', (x) => String(x).length);
		expect(r.get('len')?.('abc')).toBe(3);
	});
});
