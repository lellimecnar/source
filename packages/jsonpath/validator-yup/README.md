# @jsonpath/validator-yup

A Yup adapter for the `@jsonpath/plugin-validate` plugin.

## Installation

```bash
pnpm add @jsonpath/validator-yup yup
```

## Usage

```typescript
import { createCompleteEngine } from '@jsonpath/complete';
import { yupAdapter } from '@jsonpath/validator-yup';
import * as yup from 'yup';

const engine = createCompleteEngine();
const schema = yup.string().email();

const data = { email: 'test@example.com' };

// Use the validate function with the yup adapter
const isValid = engine.evaluateSync('$.email', data, {
	validate: {
		schema,
		adapter: yupAdapter,
	},
});
```

## License

[MIT](../../../LICENSE)
