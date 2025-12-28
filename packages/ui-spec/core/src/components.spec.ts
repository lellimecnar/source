import { resolveComponentTree } from './components';
import type { UISpecSchema } from './schema';

describe('components', () => {
	it('resolves $ref into component root with merged props', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			components: {
				Button: {
					root: { type: 'button', props: { role: 'button' }, children: 'OK' },
				},
			},
			root: { type: 'div' },
		};

		const node = resolveComponentTree(schema, {
			type: 'div',
			children: {
				type: 'Button',
				$ref: 'Button',
				props: { disabled: true },
			} as any,
		});

		const child = (node.children as any[])[0];
		expect(child.type).toBe('button');
		expect(child.props.disabled).toBe(true);
		expect(child.props.role).toBe('button');
	});

	it('projects slots via Slot node convention', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			components: {
				Card: {
					root: {
						type: 'div',
						children: [{ type: 'Slot', props: { name: 'default' } } as any],
					},
				},
			},
			root: { type: 'div' },
		};

		const node = resolveComponentTree(schema, {
			type: 'Card',
			$ref: 'Card',
			$slots: { default: { type: 'span', children: 'Hello' } },
		} as any);

		expect((node.children as any[])[0].type).toBe('span');
	});
});
