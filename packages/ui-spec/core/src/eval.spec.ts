import { resolveValue } from './eval/resolveValue';
import { createStore } from './store';

describe('eval.resolveValue', () => {
	it('resolves $path via store', () => {
		const store = createStore({ user: { name: 'Ada' } });
		const value = resolveValue({ $path: '$.user.name' } as any, { store });
		expect(value).toBe('Ada');
	});

	it('throws for $expr when UIScript not enabled', () => {
		const store = createStore({});
		expect(() => resolveValue({ $expr: '1+1' } as any, { store })).toThrow(
			/disabled/,
		);
	});
});
