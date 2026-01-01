# @jsonpath/plugin-parent-selector

This plugin provides an optional extension for selecting the parent of the current node using the `^` selector.

## Syntax

- `$.store.book[*].author^` - Selects the book object that contains the author.

## Installation

```bash
pnpm add @jsonpath/plugin-parent-selector
```

## Usage

```typescript
import { createEngine } from '@jsonpath/core';
import { plugin as parentPlugin } from '@jsonpath/plugin-parent-selector';

const engine = createEngine({
	plugins: [parentPlugin],
});
```
