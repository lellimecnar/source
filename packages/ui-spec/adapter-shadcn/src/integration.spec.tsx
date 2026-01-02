import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UISpecProvider, UISpecRoot } from '@ui-spec/react';
import { FunctionRegistry, createJsonp3FunctionRegistry } from '@ui-spec/core';
import { createShadcnAdapter } from './index';

describe('UI-Spec Integration', () => {
	it('full flow: shadcn + store + functions + events', async () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('toggle', (ctx) => {
			const current = (ctx as any).get('$.enabled');
			(ctx as any).set('$.enabled', !current);
		});
		functions.registerFunction('getLabel', (ctx) => {
			return (ctx as any).get('$.enabled') ? 'Enabled' : 'Disabled';
		});

		const schema = {
			data: { enabled: false },
			root: {
				type: 'div',
				children: [
					{
						type: 'Button',
						children: [
							{
								$call: { id: 'getLabel' },
							},
						],
					},
					{
						type: 'Button',
						props: {
							title: { $path: '$.enabled' },
						},
						$on: {
							onClick: { $call: { id: 'toggle' } },
						},
					},
				],
			},
		};

		render(
			<UISpecProvider
				schema={schema}
				adapters={[createShadcnAdapter()]}
				functions={functions}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(screen.getByText('Disabled')).toBeTruthy();

		const buttons = screen.getAllByRole('button');
		fireEvent.click(buttons[1]!);

		expect(await screen.findByText('Enabled')).toBeTruthy();
	});
});
