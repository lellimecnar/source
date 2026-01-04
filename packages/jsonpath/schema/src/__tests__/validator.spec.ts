import { describe, it, expect } from 'vitest';
import { JSONPointer } from '@jsonpath/pointer';

import { createSchemaValidator } from '../validator.js';
import type { SchemaAdapter } from '../types.js';

describe('@jsonpath/schema', () => {
	it('delegates to adapter', () => {
		const adapter: SchemaAdapter<any> = {
			name: 'mock',
			inferTypeScript: () => 'string',
			validateValue: (_schema, pointer, value) => {
				return {
					valid: pointer.toString() === '/a' && value === 'ok',
					errors:
						pointer.toString() === '/a' && value === 'ok'
							? []
							: [{ code: 'INVALID', message: 'bad', pointer }],
				};
			},
			validatePatch: () => ({ valid: true, errors: [] }),
		};

		const validator = createSchemaValidator(adapter);
		expect(validator.adapterName).toBe('mock');
		expect(validator.inferTypeScript({}, new JSONPointer('/a'))).toBe('string');

		const ok = validator.validateValue({}, new JSONPointer('/a'), 'ok');
		expect(ok.valid).toBe(true);

		const bad = validator.validateValue({}, new JSONPointer('/a'), 'nope');
		expect(bad.valid).toBe(false);
	});
});
