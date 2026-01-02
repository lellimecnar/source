import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { createJsonp3FunctionRegistry, FunctionRegistry } from '@ui-spec/core';

import { UISpecProvider } from './provider';
import { UISpecRoot } from './render';
import { useUISpecValue } from './hooks';

function CounterView() {
	const n = useUISpecValue<number>('$.n');
	return <div>{n}</div>;
}

describe('useUISpecValue', () => {
	it('subscribes and updates when selected value changes', () => {
		const functions = new FunctionRegistry(createJsonp3FunctionRegistry());
		functions.registerFunction('inc', (ctx) => {
			(ctx as any).set('$.n', Number((ctx as any).get('$.n')) + 1);
		});

		render(
			<UISpecProvider
				schema={{
					data: { n: 0 },
					root: {
						type: 'button',
						$on: { onClick: { $call: { id: 'inc' } } },
						children: ['inc'],
					},
				}}
				functions={functions}
			>
				<UISpecRoot />
				<CounterView />
				<div />
			</UISpecProvider>,
		);

		expect(screen.getByText('0')).toBeTruthy();
		fireEvent.click(screen.getByText('inc'));
		expect(screen.getByText('1')).toBeTruthy();
	});
});
