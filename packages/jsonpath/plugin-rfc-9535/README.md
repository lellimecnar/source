# @jsonpath/plugin-rfc-9535

This package provides a comprehensive set of plugins that implement the [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535.html) standard for JSONPath.

## Features

- **Full RFC 9535 Compliance**: Implements all selectors, filters, and functions defined in the standard.
- **Modular**: Includes individual plugins for each part of the syntax, allowing you to pick and choose if needed.
- **Preset**: Provides a `rfc9535Plugins` array for easy integration into `@jsonpath/core`.

## Installation

```bash
pnpm add @jsonpath/plugin-rfc-9535
```

## Usage

```typescript
import { createEngine } from '@jsonpath/core';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

const engine = createEngine({
	plugins: rfc9535Plugins,
});

const results = engine.evaluateSync('$.store.book[*].author', data);
```

## Included Plugins

This preset includes the following plugins:

- `@jsonpath/plugin-syntax-root`: `$` root selector.
- `@jsonpath/plugin-syntax-wildcard`: `*` wildcard selector.
- `@jsonpath/plugin-syntax-identifier`: Dot-notation identifiers (`.prop`).
- `@jsonpath/plugin-syntax-bracket-string`: Bracket-notation strings (`['prop']`).
- `@jsonpath/plugin-syntax-bracket-index`: Bracket-notation indices (`[0]`).
- `@jsonpath/plugin-syntax-slice`: Array slicing (`[0:5:1]`).
- `@jsonpath/plugin-syntax-descendant`: Descendant segment (`..`).
- `@jsonpath/plugin-syntax-filter`: Filter expressions (`[?(@.price < 10)]`).
- `@jsonpath/plugin-filter-regex`: Regex support in filters.
- `@jsonpath/plugin-functions-core`: Core functions (`length()`, `count()`, `match()`, `search()`).
