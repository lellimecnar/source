import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createJsonp3FunctionRegistry, FunctionRegistry } from '@ui-spec/core';

import { UISpecProvider } from './provider';
import { UISpecRoot } from './render';

describe('UISpec rendering', () => {
	it('updates UI after store mutation via click handler', async () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('inc', (ctx) => {
			const current = (ctx as any).get('$.count');
			(ctx as any).set('$.count', Number(current) + 1);
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
								type: 'button',
								$on: { onClick: { $call: { id: 'inc' } } },
								children: ['+'],
							},
						],
					},
				}}
				functions={functions}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(screen.getByText('0')).toBeTruthy();
		fireEvent.click(screen.getByText('+'));
		expect(await screen.findByText('1')).toBeTruthy();
	});
});
