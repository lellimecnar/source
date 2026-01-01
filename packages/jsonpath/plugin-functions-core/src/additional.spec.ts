import { describe, expect, it } from 'vitest';

import { FunctionRegistry, plugin } from './index';

describe('@jsonpath/plugin-functions-core (additional)', () => {
	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-functions-core');
		expect(plugin.meta.capabilities).toContain('functions:rfc9535:core');
	});

	it('returns undefined for unknown function', () => {
		const r = new FunctionRegistry();
		expect(r.get('missing')).toBeUndefined();
	});

	it('registers and retrieves functions by name', () => {
		const r = new FunctionRegistry();
		const fn = (x: unknown) => x;
		r.register('id', fn);
		expect(r.get('id')).toBe(fn);
	});

	it('allows overwriting a name', () => {
		const r = new FunctionRegistry();
		const a = () => 'a';
		const b = () => 'b';
		r.register('x', a);
		r.register('x', b);
		expect(r.get('x')).toBe(b);
	});

	it('does not share state across instances', () => {
		const r1 = new FunctionRegistry();
		const r2 = new FunctionRegistry();
		r1.register('x', () => 1);
		expect(r2.get('x')).toBeUndefined();
	});
});
