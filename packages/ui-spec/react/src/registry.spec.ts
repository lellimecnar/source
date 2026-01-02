import { describe, expect, it } from 'vitest';

import { createComponentRegistry } from './registry';

describe('createComponentRegistry', () => {
	it('applies adapters in order (last wins)', () => {
		const A = () => null;
		const B = () => null;

		const registry = createComponentRegistry({
			adapters: [
				{ getComponents: () => ({ Button: A }) },
				{ getComponents: () => ({ Button: B }) },
			],
		});

		expect(registry.require('Button')).toBe(B);
	});
});
