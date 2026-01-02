# @jsonpath/jsonpath

RFC 9535 JSONPath for JavaScript - zero configuration required.

## Overview

This is the **main entrypoint** for typical JSONPath consumers. It provides a ready-to-use RFC 9535-compliant engine with no configuration required.

## Usage

```ts
import engine from '@jsonpath/jsonpath';
// or
import { evaluateSync, compile, parse } from '@jsonpath/jsonpath';

const result = evaluateSync('$.store.books[*].title', data);
```

## API

- `engine` - Default lazy-initialized RFC 9535 engine (default export)
- `evaluateSync(expression, json, options?)` - Compile and evaluate in one call
- `evaluateAsync(expression, json, options?)` - Async version
- `compile(expression)` - Compile expression for reuse
- `parse(expression)` - Parse to AST
- `createEngine(options?)` - Create custom engine with additional plugins

## Extension Plugins

To add extensions beyond RFC 9535:

```ts
import { createEngine } from '@jsonpath/jsonpath';
import { parentSelectorPlugin } from '@jsonpath/plugin-parent-selector';

const engine = createEngine({ plugins: [parentSelectorPlugin] });
```

## Testing

This package includes the RFC 9535 Compliance Test Suite (CTS) as test-only modules under `src/__tests__/compliance/`.
