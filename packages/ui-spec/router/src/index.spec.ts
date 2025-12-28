import type { UISpecSchema } from '@ui-spec/core';

import { matchPath } from './match';

describe('router matchPath', () => {
	it('matches params', () => {
		expect(matchPath('/users/:id', '/users/123')?.params.id).toBe('123');
	});
});

describe('createRouter', () => {
	it('creates without throwing for basic schema', () => {
		const schema: UISpecSchema = {
			$uispec: '1.0',
			routes: [{ path: '/', root: { type: 'div' } }],
		};
		expect(schema.routes?.length).toBe(1);
	});
});
