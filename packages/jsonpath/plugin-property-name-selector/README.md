# @jsonpath/plugin-property-name-selector

This plugin provides an optional extension for selecting the property name (key) of the current node using the `~` selector.

## Syntax

- `$.store.book[*].author~` - Selects the string "author" for each book's author property.

## Installation

```bash
pnpm add @jsonpath/plugin-property-name-selector
```

## Usage

```typescript
import { createEngine } from '@jsonpath/core';
import { plugin as propertyNamePlugin } from '@jsonpath/plugin-property-name-selector';

const engine = createEngine({
	plugins: [propertyNamePlugin],
});
```
