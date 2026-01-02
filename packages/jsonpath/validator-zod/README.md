# @jsonpath/validator-zod

A Zod adapter for the `@jsonpath/plugin-validate` plugin.

## Installation

```bash
pnpm add @jsonpath/validator-zod zod
```

## Usage

```typescript
import { createCompleteEngine } from '@jsonpath/complete';
import { zodAdapter } from '@jsonpath/validator-zod';
import { z } from 'zod';

const engine = createCompleteEngine();
const schema = z.string().email();

const data = { email: 'test@example.com' };

// Use the validate function with the zod adapter
const isValid = engine.evaluateSync('$.email', data, {
	validate: {
		schema,
		adapter: zodAdapter,
	},
});
```

## License

[MIT](../../../LICENSE)
