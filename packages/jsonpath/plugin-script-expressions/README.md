# @jsonpath/plugin-script-expressions

This plugin provides support for script expressions (`(...)`) and filter script expressions (`[?(...)]`) in JSONPath, using [SES (Secure EcmaScript)](https://github.com/endojs/endo/tree/master/packages/ses) for sandboxed execution.

## Features

- **Sandboxed Execution**: Uses SES to ensure that script expressions cannot access the global environment or perform dangerous operations.
- **Full JavaScript Support**: Supports standard JavaScript expressions within the sandbox.
- **Opt-in**: This is an optional extension and is not part of the core RFC 9535 standard.

## Installation

```bash
pnpm add @jsonpath/plugin-script-expressions
```

## Usage

```typescript
import { createEngine } from '@jsonpath/core';
import { plugin as scriptPlugin } from '@jsonpath/plugin-script-expressions';

const engine = createEngine({
	plugins: [scriptPlugin],
});

// Use script expressions
const results = engine.evaluateSync('$.store.book[(1 + 1)].author', data);
```
