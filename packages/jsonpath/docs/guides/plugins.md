# Plugin System

The JSONPath evaluator supports a minimal plugin system for hooks into the evaluation lifecycle.

## Interface

```typescript
export interface JSONPathPlugin {
	readonly name: string;

	beforeEvaluate?(ctx: BeforeEvaluateContext): void;
	afterEvaluate?(ctx: AfterEvaluateContext): void;
	onError?(ctx: EvaluateErrorContext): void;
}
```

## Usage

```typescript
import { query } from '@jsonpath/jsonpath';

const loggerPlugin = {
	name: 'logger',
	beforeEvaluate: ({ query }) => console.log(`Evaluating: ${query}`),
	afterEvaluate: ({ result }) => console.log(`Found ${result.length} matches`),
};

const data = { a: 1 };
query(data, '$.a', { plugins: [loggerPlugin] });
```

## Isolation

Plugins are isolated; if a plugin hook throws an error, it is caught and ignored by the evaluator to ensure that plugin failures do not break the core evaluation process.
