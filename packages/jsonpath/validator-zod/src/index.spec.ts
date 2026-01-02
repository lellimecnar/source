import { describe, expect, it } from 'vitest';

import { z } from 'zod';

import { createZodAdapter } from './index';

describe('@jsonpath/validator-zod', () => {
	it('returns issues for invalid values', () => {
		const adapter = createZodAdapter(z.object({ a: z.number() }));
		expect(adapter.validate({ a: 'x' }).length).toBeGreaterThan(0);
		expect(adapter.validate({ a: 1 })).toEqual([]);
	});
});
