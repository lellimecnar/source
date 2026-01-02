import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createJsonp3FunctionRegistry, FunctionRegistry } from '@ui-spec/core';
import { createShadcnAdapter } from '@ui-spec/adapter-shadcn';

import { UISpecProvider } from '../provider';
import { UISpecRoot } from '../render';

describe('integration: counter', () => {
	it('renders and increments via registry-backed onClick', () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('inc', (ctx) => {
			(ctx as any).set('$.count', Number((ctx as any).get('$.count')) + 1);
		});

		render(
			<UISpecProvider
				schema={{
					data: { count: 0 },
					root: {
						type: 'div',
						children: [
							{ type: 'span', children: [{ $path: '$.count' }] },
							{
								type: 'Button',
								$on: { onClick: { $call: { id: 'inc' } } },
								children: ['+'],
							},
						],
					},
				}}
				functions={functions}
				adapters={[createShadcnAdapter()]}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(screen.getByText('0')).toBeTruthy();
		fireEvent.click(screen.getByText('+'));
		expect(screen.getByText('1')).toBeTruthy();
	});
});
