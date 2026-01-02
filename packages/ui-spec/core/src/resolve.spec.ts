import { describe, expect, it } from 'vitest';

import { createJsonp3FunctionRegistry } from './jsonp3';
import { FunctionRegistry } from './function-registry';
import { createUISpecContext } from './context';
import { ComponentRegistry } from './component-registry';
import { resolveNode } from './resolve';
import { createUISpecStore } from './store';

describe('resolveNode', () => {
	it('resolves $path in props and children', () => {
		const store = createUISpecStore({ label: 'Hello' });
		const ctx = createUISpecContext({
			store,
			functions: new FunctionRegistry(createJsonp3FunctionRegistry()),
		});

		const components = new ComponentRegistry<unknown>();

		const resolved = resolveNode(
			{
				type: 'div',
				props: { title: { $path: '$.label' } },
				children: ['x', { $path: '$.label' }],
			},
			ctx,
			{ components },
		);

		expect(resolved.props.title).toBe('Hello');
		expect(resolved.children).toEqual(['x', 'Hello']);
	});

	it('creates callable event handlers from $on', () => {
		const store = createUISpecStore({ n: 0 });
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		const ctx = createUISpecContext({ store, functions });
		functions.registerFunction('inc', (c) => {
			const v = (c as any).get('$.n');
			(c as any).set('$.n', Number(v) + 1);
		});

		const components = new ComponentRegistry<unknown>();
		const node = resolveNode(
			{ type: 'button', $on: { onClick: { $call: { id: 'inc' } } } },
			ctx,
			{ components },
		);

		(node.props.onClick as () => void)();
		expect(store.get('$.n')).toBe(1);
	});
});
