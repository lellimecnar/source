import { createJsonSchemaPlugin } from '.';

describe('createJsonSchemaPlugin', () => {
	it('validates against a registered schema', () => {
		const plugin = createJsonSchemaPlugin({
			schemas: {
				User: {
					type: 'object',
					properties: { name: { type: 'string' } },
					required: ['name'],
					additionalProperties: false,
				},
			},
		});

		expect(plugin.validate({ name: 'Ada' }, 'User').ok).toBe(true);
		expect(plugin.validate({ name: 1 }, 'User').ok).toBe(false);
	});
});
