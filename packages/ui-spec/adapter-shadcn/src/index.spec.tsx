import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UISpecProvider, UISpecRoot } from '@ui-spec/react';
import { createShadcnAdapter } from './index';

describe('shadcnAdapter', () => {
	it('renders a shadcn Button via UISpec', () => {
		const schema = {
			data: {},
			root: {
				type: 'Button',
				children: ['Click me'],
			},
		};

		render(
			<UISpecProvider schema={schema} adapters={[createShadcnAdapter()]}>
				<UISpecRoot />
			</UISpecProvider>,
		);

		const button = screen.getByRole('button', { name: /click me/i });
		expect(button).toBeTruthy();
	});
});
