import { describe, expect, it } from 'vitest';

import * as yup from 'yup';

import { createYupAdapter } from './index';

describe('@jsonpath/validator-yup (additional)', () => {
	it('returns an adapter with stable id', () => {
		const adapter = createYupAdapter(yup.mixed());
		expect(adapter.id).toBe('@jsonpath/validator-yup');
	});

	it('returns empty issues when schema passes', () => {
		const adapter = createYupAdapter(
			yup.object({ a: yup.string().required() }),
		);
		expect(adapter.validate({ a: 'ok' })).toEqual([]);
	});

	it('returns issues when schema fails', () => {
		const adapter = createYupAdapter(
			yup.object({ a: yup.string().required() }),
		);
		const issues = adapter.validate({});
		expect(issues.length).toBeGreaterThan(0);
		expect(issues[0]).toMatchObject({
			message: expect.any(String),
			code: expect.any(String),
		});
	});

	it('formats dot paths as /a/b', () => {
		const adapter = createYupAdapter(
			yup.object({ a: yup.object({ b: yup.string().required() }) }),
		);
		const issues = adapter.validate({ a: {} });
		expect(issues.map((i) => i.path)).toContain('/a/b');
	});

	it('uses empty path when yup path is missing', () => {
		const adapter = createYupAdapter(yup.string().required());
		const issues = adapter.validate(undefined);
		expect(issues[0]?.path).toBe('');
	});
});
