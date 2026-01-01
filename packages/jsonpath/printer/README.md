# @jsonpath/printer

A feature-agnostic JSONPath printer infrastructure for converting an Abstract Syntax Tree (AST) back into a JSONPath expression string.

## Features

- **AST to String**: Convert `@jsonpath/ast` nodes back into valid JSONPath strings.
- **Extensible**: Register custom printers for new AST node types.
- **Deterministic**: Produces consistent, normalized JSONPath expressions.
- **TypeScript Native**: Fully written in TypeScript.

## Installation

```bash
pnpm add @jsonpath/printer
```

## Usage

```typescript
import { printPath } from '@jsonpath/printer';
import type { PathNode } from '@jsonpath/ast';

const ast: PathNode = {
	kind: 'Path',
	scope: 'root',
	segments: [
		{
			kind: 'Segment',
			selectors: [{ kind: 'Selector:Name', name: 'store' }],
		},
	],
};

const expression = printPath(ast);
console.log(expression); // '$.store'
```

## API

### `printPath(node)`

Converts a `PathNode` AST into a JSONPath string.

### `printSelector(node)`

Converts a `SelectorNode` AST into a JSONPath string.

## License

[MIT](../../../LICENSE)
