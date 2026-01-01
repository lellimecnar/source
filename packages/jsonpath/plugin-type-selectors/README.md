# @jsonpath/plugin-type-selectors

This plugin provides an optional extension for selecting nodes by their JSON type (e.g., `string`, `number`, `boolean`, `object`, `array`, `null`).

## Syntax

- `$.store.book[*].author:string` - Selects all authors that are strings.
- `$.store.book[*]:object` - Selects all books that are objects.

## Installation

```bash
pnpm add @jsonpath/plugin-type-selectors
```

## Usage

```typescript
import { createEngine } from '@jsonpath/core';
import { plugin as typePlugin } from '@jsonpath/plugin-type-selectors';

const engine = createEngine({
	plugins: [typePlugin],
});
```
