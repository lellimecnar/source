import { describe, expect, it } from 'vitest';

import { z } from 'zod';

import { createZodAdapter } from './index';

describe('@jsonpath/validator-zod (additional)', () => {
	it('returns an adapter with stable id', () => {
		const adapter = createZodAdapter(z.any());
		expect(adapter.id).toBe('@jsonpath/validator-zod');
	});

	it('returns empty issues when schema passes', () => {
		const adapter = createZodAdapter(z.object({ a: z.string() }));
		expect(adapter.validate({ a: 'ok' })).toEqual([]);
	});

	it('includes code + message on failure', () => {
		const adapter = createZodAdapter(z.object({ a: z.string() }));
		const issues = adapter.validate({ a: 123 });
		expect(issues.length).toBeGreaterThan(0);
		expect(issues[0]).toMatchObject({
			message: expect.any(String),
			code: expect.any(String),
		});
	});

	it('formats nested paths as /a/b', () => {
		const adapter = createZodAdapter(
			z.object({ a: z.object({ b: z.string() }) }),
		);
		const issues = adapter.validate({ a: { b: 123 } });
		expect(issues.map((i) => i.path)).toContain('/a/b');
	});

	it('uses empty path for root-level errors', () => {
		const adapter = createZodAdapter(z.string());
		const issues = adapter.validate(123);
		expect(issues[0]?.path).toBe('');
	});
});
