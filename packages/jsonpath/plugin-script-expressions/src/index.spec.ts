import { describe, expect, it } from 'vitest';

import { createCompartment, plugin } from './index';

describe('@jsonpath/plugin-script-expressions', () => {
	it('creates a SES compartment', () => {
		const c = createCompartment({ endowments: { x: 1 } });
		expect(typeof (c as any).evaluate).toBe('function');
	});

	it('exports plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-script-expressions');
	});
});
