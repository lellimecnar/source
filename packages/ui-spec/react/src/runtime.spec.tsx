import { type UISpecSchema } from '@ui-spec/core';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { UISpecProvider } from './provider';
import { UISpecApp } from './render';

// Jest runs this test in jsdom; some jsdom versions do not provide `structuredClone`.
// The store uses `structuredClone` to ensure snapshot reference changes.
if (typeof (globalThis as any).structuredClone !== 'function') {
	(globalThis as any).structuredClone = (value: unknown) =>
		JSON.parse(JSON.stringify(value));
}

describe('react runtime', () => {
	it('renders into jsdom and supports basic click event wiring shape', async () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { count: 0 },
			functions: {
				inc: {
					$fn: '(ctx) => ctx.store.set("$.count", (ctx.store.get("$.count") ?? 0) + 1)',
				},
			},
			root: {
				type: 'button',
				props: { id: 'btn' },
				$on: { click: { $call: { name: 'inc' } } },
				children: { $path: '$.count' },
			} as any,
		};

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<UISpecProvider schema={schema} uiscript={{ enabled: true }}>
					<UISpecApp />
				</UISpecProvider>,
			);
		});

		const btn = container.querySelector('#btn')!;
		expect(btn).toBeTruthy();

		await act(async () => {
			btn.click();
		});

		expect(container.textContent).toContain('1');
	});
});
