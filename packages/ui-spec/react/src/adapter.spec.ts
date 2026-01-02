import { describe, expect, it } from 'vitest';

import type { UISpecComponentAdapter } from './adapter';

describe('UISpecComponentAdapter', () => {
	it('is a simple component provider interface', () => {
		const adapter: UISpecComponentAdapter = {
			getComponents: () => ({ X: () => null }),
		};
		expect(Object.keys(adapter.getComponents())).toEqual(['X']);
	});
});
