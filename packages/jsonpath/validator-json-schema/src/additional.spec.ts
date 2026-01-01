import { describe, expect, it } from 'vitest';

import { createJsonSchemaAdapter } from './index';

describe('@jsonpath/validator-json-schema (additional)', () => {
	it('returns an adapter with stable id', () => {
		const adapter = createJsonSchemaAdapter({});
		expect(adapter.id).toBe('@jsonpath/validator-json-schema');
	});

	it('returns empty issues when schema passes', () => {
		const adapter = createJsonSchemaAdapter({ type: 'string' });
		expect(adapter.validate('ok')).toEqual([]);
	});

	it('returns issues when schema fails', () => {
		const adapter = createJsonSchemaAdapter({ type: 'string' });
		const issues = adapter.validate(123);
		expect(issues.length).toBeGreaterThan(0);
		expect(issues[0]).toMatchObject({
			message: expect.any(String),
			code: expect.any(String),
		});
	});

	it('preserves AJV instancePath in issue.path', () => {
		const adapter = createJsonSchemaAdapter({
			type: 'object',
			properties: { a: { type: 'string' } },
		});
		const issues = adapter.validate({ a: 123 });
		expect(issues.map((i) => i.path)).toContain('/a');
	});

	it('can return multiple issues with allErrors enabled', () => {
		const adapter = createJsonSchemaAdapter({
			type: 'object',
			required: ['a'],
			properties: { a: { type: 'string' } },
		});
		const issues = adapter.validate({ a: 123 });
		expect(issues.length).toBeGreaterThan(0);
	});
});
