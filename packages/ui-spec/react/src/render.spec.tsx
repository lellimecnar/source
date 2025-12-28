import { type UISpecSchema } from '@ui-spec/core';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { UISpecProvider } from './provider';
import { UISpecApp } from './render';

describe('uISpecApp', () => {
	it('renders text and $path binding', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			data: { user: { name: 'Ada' } },
			root: {
				type: 'div',
				children: [
					{ type: 'span', children: 'Hi ' },
					{ type: 'span', children: { $path: '$.user.name' } },
				],
			},
		};

		const html = renderToStaticMarkup(
			<UISpecProvider schema={schema}>
				<UISpecApp />
			</UISpecProvider>,
		);

		expect(html).toContain('Hi');
		expect(html).toContain('Ada');
	});
});
