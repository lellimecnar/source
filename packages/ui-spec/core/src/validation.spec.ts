import { createValidationRegistry } from './validation';

describe('validation registry', () => {
	it('uses named plugin', () => {
		const registry = createValidationRegistry([
			{
				name: 'test',
				validate: (value) =>
					typeof value === 'string'
						? { ok: true }
						: { ok: false, errors: ['not string'] },
			},
		]);

		expect(registry.validate('x', 'Any', 'test').ok).toBe(true);
		expect(registry.validate(1, 'Any', 'test').ok).toBe(false);
	});
});
