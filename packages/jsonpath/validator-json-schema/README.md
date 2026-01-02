# @jsonpath/validator-json-schema

A JSON Schema adapter for the `@jsonpath/plugin-validate` plugin.

## Installation

```bash
pnpm add @jsonpath/validator-json-schema ajv
```

## Usage

```typescript
import { createCompleteEngine } from '@jsonpath/complete';
import { jsonSchemaAdapter } from '@jsonpath/validator-json-schema';

const engine = createCompleteEngine();
const schema = {
	type: 'string',
	format: 'email',
};

const data = { email: 'test@example.com' };

// Use the validate function with the json-schema adapter
const isValid = engine.evaluateSync('$.email', data, {
	validate: {
		schema,
		adapter: jsonSchemaAdapter,
	},
});
```

## License

[MIT](../../../LICENSE)
