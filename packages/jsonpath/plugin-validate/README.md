# @jsonpath/plugin-validate

This plugin provides an orchestration layer for validating JSONPath results using various schema and validation libraries (e.g., Zod, Yup, JSON Schema).

## Features

- **Pluggable Validators**: Use any validation library by providing a compatible adapter.
- **Integrated Validation**: Validate results directly within the JSONPath evaluation process.

## Installation

```bash
pnpm add @jsonpath/plugin-validate
```

## Usage

```typescript
import { createEngine } from '@jsonpath/core';
import { plugin as validatePlugin } from '@jsonpath/plugin-validate';
import { zodAdapter } from '@jsonpath/validator-zod';
import { z } from 'zod';

const engine = createEngine({
	plugins: [validatePlugin],
});

const schema = z.string().email();

// Validate results using the zod adapter
const results = engine.evaluateSync('$.users[*].email', data, {
	validate: zodAdapter(schema),
});
```
