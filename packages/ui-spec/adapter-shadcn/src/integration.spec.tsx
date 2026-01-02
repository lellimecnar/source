import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UISpecProvider, UISpecRoot } from '@ui-spec/react';
import { FunctionRegistry, createJsonp3FunctionRegistry } from '@ui-spec/core';
import { shadcnAdapter } from './index';

describe('UI-Spec Integration', () => {
	it('full flow: shadcn + store + functions + events', async () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('toggle', (ctx) => {
			const current = ctx.get('$.enabled');
			ctx.set('$.enabled', !current);
		});
		functions.registerFunction('getLabel', (ctx) => {
			return ctx.get('$.enabled') ? 'Enabled' : 'Disabled';
		});

		const schema = {
			data: { enabled: false },
			root: {
				type: 'div',
				children: [
					{
						type: 'Label',
						children: [
							{
								$call: { id: 'getLabel' },
							},
						],
					},
					{
						type: 'Switch',
						props: {
							checked: { $path: '$.enabled' },
						},
						$on: {
							onCheckedChange: { $call: { id: 'toggle' } },
						},
					},
				],
			},
		};

		render(
			<UISpecProvider
				schema={schema}
				adapters={[shadcnAdapter]}
				functions={functions}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(screen.getByText('Disabled')).toBeTruthy();

		const switchEl = screen.getByRole('switch');
		fireEvent.click(switchEl);

		expect(await screen.findByText('Enabled')).toBeTruthy();
	});
});
