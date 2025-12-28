import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { AsyncBoundary } from './AsyncBoundary';

describe('asyncBoundary', () => {
	it('renders fallback then value', async () => {
		let resolve!: (v: string) => void;
		const promise = new Promise<string>((r) => (resolve = r));

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(
				<AsyncBoundary promise={promise} fallback={<span>Loading</span>}>
					{(v) => <span>{v}</span>}
				</AsyncBoundary>,
			);
		});

		expect(container.textContent).toContain('Loading');

		await act(async () => {
			resolve('Done');
			await promise;
		});

		expect(container.textContent).toContain('Done');
	});
});
