import Ajv from 'ajv';

import type { Issue, ValidatorAdapter } from '@jsonpath/plugin-validate';

export type JsonSchema = Record<string, unknown>;

export function createJsonSchemaAdapter(schema: JsonSchema): ValidatorAdapter {
	const ajv = new Ajv({ allErrors: true, strict: false });
	const validate = ajv.compile(schema as any);

	return {
		id: '@jsonpath/validator-json-schema',
		validate: (value: unknown): Issue[] => {
			const ok = validate(value as any);
			if (ok) return [];
			const errors = validate.errors ?? [];
			return errors.map((e) => ({
				message: e.message ?? 'Schema validation error',
				code: String(e.keyword ?? 'schema'),
				path: String(e.instancePath ?? ''),
				meta: e,
			}));
		},
	};
}
