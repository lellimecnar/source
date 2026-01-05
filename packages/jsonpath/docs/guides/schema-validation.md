# Schema Validation

The `@jsonpath/schema` package provides an adapter-based system for validating data and patches against a schema.

## Usage

```typescript
import { createSchemaValidator } from '@jsonpath/schema';
import { JSONPointer } from '@jsonpath/pointer';

// Define an adapter for your schema format (e.g., JSON Schema, Zod, etc.)
const myAdapter = {
	name: 'my-adapter',
	validateValue: (schema, pointer, value) => {
		// ... implementation ...
		return { valid: true, errors: [] };
	},
	validatePatch: (schema, patch) => {
		// ... implementation ...
		return { valid: true, errors: [] };
	},
	inferTypeScript: (schema, pointer) => 'string',
};

const validator = createSchemaValidator(myAdapter);

const result = validator.validateValue(
	mySchema,
	new JSONPointer('/a'),
	'some value',
);
if (!result.valid) {
	console.error(result.errors);
}
```

## Why use an adapter?

By using an adapter, the core JSONPath suite remains agnostic to the specific schema language you use, while still providing a unified interface for validation across different parts of your application.
