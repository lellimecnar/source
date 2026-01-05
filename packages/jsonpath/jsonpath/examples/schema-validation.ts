import { createSchemaValidator } from '@jsonpath/schema';
import { JSONPointer } from '@jsonpath/pointer';

export function runSchemaExample(): boolean {
	const mockAdapter = {
		name: 'mock',
		validateValue: (_schema: any, pointer: JSONPointer, value: any) => {
			return {
				valid: pointer.toString() === '/a' && value === 'ok',
				errors: [],
			};
		},
		validatePatch: () => ({ valid: true, errors: [] }),
		inferTypeScript: () => 'string',
	};

	const validator = createSchemaValidator(mockAdapter);
	const result = validator.validateValue({}, new JSONPointer('/a'), 'ok');
	return result.valid;
}
