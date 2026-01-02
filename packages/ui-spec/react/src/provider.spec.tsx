import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { UISpecProvider } from './provider';
import { UISpecRoot } from './render';

describe('UISpecProvider', () => {
	it('renders the schema root via UISpecRoot', () => {
		const { container } = render(
			<UISpecProvider
				schema={{
					data: { msg: 'hi' },
					root: { type: 'div', children: [{ $path: '$.msg' }] },
				}}
			>
				<UISpecRoot />
			</UISpecProvider>,
		);

		expect(container.textContent).toBe('hi');
	});
});
