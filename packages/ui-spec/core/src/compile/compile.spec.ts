import type { UISpecSchema } from '../schema';
import { compileNode } from './compileNode';
import { createStore } from '../store';

describe('compileNode', () => {
	it('compiles $if branches', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { flag: true },
			root: { type: 'div' },
		};
		const store = createStore(schema.data);

		const node = compileNode(
			{
				type: 'div',
				$if: { $path: '$.flag' },
				$then: { type: 'span', children: 'yes' },
				$else: { type: 'span', children: 'no' },
			} as any,
			{ schema, store },
		);

		expect(node.type).toBe('span');
	});

	it('compiles $for into fragment children', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { items: [1, 2] },
			root: { type: 'div' },
		};
		const store = createStore(schema.data);

		const node = compileNode(
			{
				type: 'div',
				$for: {
					each: { $path: '$.items' },
					as: 'item',
					then: { type: 'span', children: 'x' },
				},
			} as any,
			{ schema, store },
		);

		expect(node.type).toBe('fragment');
		expect(Array.isArray(node.children)).toBe(true);
	});
});
