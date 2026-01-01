# @jsonpath/plugin-syntax-root

This plugin provides support for the root selector (`$`) in JSONPath expressions, as defined in RFC 9535.

## Installation

```bash
pnpm add @jsonpath/plugin-syntax-root
```

## Usage

```typescript
import { createEngine } from '@jsonpath/core';
import { plugin as rootPlugin } from '@jsonpath/plugin-syntax-root';

const engine = createEngine({
	plugins: [rootPlugin],
});
```
