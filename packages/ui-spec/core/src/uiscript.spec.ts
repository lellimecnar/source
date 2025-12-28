import { resolveValue } from './eval/resolveValue';
import type { UISpecSchema } from './schema';
import { createStore } from './store';
import { createUIScriptExec } from './uiscript';

describe('uiscript', () => {
	it('executes $expr when enabled', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			functions: {},
			root: { type: 'div' },
		};
		const store = createStore({});
		const exec = createUIScriptExec(schema, { enabled: true });
		const value = resolveValue({ $expr: '1 + 1' } as any, { store, exec });
		expect(value).toBe(2);
	});

	it('invokes named functions via $call', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			functions: { add: { $fn: '(ctx, a, b) => a + b' } },
			root: { type: 'div' },
		};
		const store = createStore({});
		const exec = createUIScriptExec(schema, { enabled: true });
		const value = resolveValue(
			{ $call: { name: 'add', args: [1, 2] } } as any,
			{ store, exec },
		);
		expect(value).toBe(3);
	});
});
