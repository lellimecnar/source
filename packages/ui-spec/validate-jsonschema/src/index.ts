import type { ValidationPlugin, ValidationResult } from '@ui-spec/core';
import Ajv from 'ajv';

export type JSONSchemaRegistry = Record<string, unknown>;

export function createJsonSchemaPlugin(options: {
	schemas: JSONSchemaRegistry;
}): ValidationPlugin {
	const ajv = new Ajv({ allErrors: true, strict: false });
	for (const [key, schema] of Object.entries(options.schemas)) {
		ajv.addSchema(schema as any, key);
	}

	return {
		name: 'jsonschema',
		validate(value: unknown, schemaRef: string): ValidationResult {
			const validate = ajv.getSchema(schemaRef);
			if (!validate)
				return {
					ok: false,
					errors: [{ message: `Unknown schemaRef: ${schemaRef}` }],
				};
			const ok = validate(value);
			if (ok) return { ok: true };
			return { ok: false, errors: validate.errors ?? [] };
		},
	};
}
