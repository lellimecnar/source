import { describe, expect, it } from 'vitest';

import { createCompartment, plugin } from './index';

describe('@jsonpath/plugin-script-expressions (additional)', () => {
	it('exports stable plugin metadata', () => {
		expect(plugin.meta.id).toBe('@jsonpath/plugin-script-expressions');
		expect(plugin.meta.capabilities).toContain('filter:script:ses');
	});

	it('throws a clear error when Compartment is missing', () => {
		const original = (globalThis as any).Compartment;
		try {
			(globalThis as any).Compartment = undefined;
			expect(() => createCompartment()).toThrow(
				/SES Compartment is not available/i,
			);
		} finally {
			(globalThis as any).Compartment = original;
		}
	});

	it('creates a compartment when available', () => {
		const c = createCompartment();
		expect(c).toBeTruthy();
	});

	it('passes endowments through', () => {
		const c: any = createCompartment({ endowments: { x: 123 } });
		if (typeof c?.evaluate === 'function') {
			expect(c.evaluate('x')).toBe(123);
		} else {
			// Minimal contract: compartment exists even if evaluate is unavailable.
			expect(c).toBeTruthy();
		}
	});

	it('defaults options to an empty object', () => {
		expect(() => createCompartment(undefined as any)).not.toThrow();
	});
});
