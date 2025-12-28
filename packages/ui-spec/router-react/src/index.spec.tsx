import type { UISpecSchema } from '@ui-spec/core';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

import { UISpecRouter } from './UISpecRouter';

describe('uISpecRouter', () => {
	it('renders without crashing for a simple route', async () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			routes: [{ path: '/', root: { type: 'div', children: 'Home' } }],
		};

		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);

		await act(async () => {
			root.render(<UISpecRouter schema={schema} />);
		});

		expect(container.textContent).toContain('Home');
	});
});
