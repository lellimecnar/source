import { describe, expect, it } from 'vitest';

import { createShadcnAdapter } from './adapter';

describe('createShadcnAdapter', () => {
	it('provides a stable component mapping', () => {
		const adapter = createShadcnAdapter();
		const components = adapter.getComponents();
		expect(Object.keys(components)).toEqual(['Button', 'Input']);
	});
});
