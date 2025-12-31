import { describe, expect, it } from 'vitest';

import * as yup from 'yup';

import { createYupAdapter } from './index';

describe('@jsonpath/validator-yup', () => {
	it('returns issues for invalid values', () => {
		const adapter = createYupAdapter(
			yup.object({ a: yup.number().required() }),
		);
		expect(adapter.validate({ a: 'x' }).length).toBeGreaterThan(0);
		expect(adapter.validate({ a: 1 })).toEqual([]);
	});
});
