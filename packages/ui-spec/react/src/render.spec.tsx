import { createStore, type UISpecSchema } from '@ui-spec/core';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { UISpecProvider } from './provider';
import { UISpecRenderer } from './render';

describe('uISpecRenderer', () => {
	it('renders text and $path binding', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			root: {
				type: 'div',
				children: [
					{ type: 'span', children: 'Hi ' },
					{ type: 'span', children: { $path: '$.user.name' } },
				],
			},
		};

		const store = createStore({ user: { name: 'Ada' } });

		const html = renderToStaticMarkup(
			<UISpecProvider store={store}>
				<UISpecRenderer schema={schema} />
			</UISpecProvider>,
		);

		expect(html).toContain('Hi');
		expect(html).toContain('Ada');
	});

	it('applies className and prop bindings', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			root: {
				type: 'button',
				class: 'btn',
				props: {
					disabled: { $path: '$.flags.disabled' },
					title: { $path: '$.labels.title' },
				},
				children: 'Click',
			},
		};

		const store = createStore({
			flags: { disabled: true },
			labels: { title: 'X' },
		});

		const html = renderToStaticMarkup(
			<UISpecProvider store={store}>
				<UISpecRenderer schema={schema} />
			</UISpecProvider>,
		);

		expect(html).toContain('class="btn"');
		expect(html).toContain('disabled');
		expect(html).toContain('title="X"');
	});
});
