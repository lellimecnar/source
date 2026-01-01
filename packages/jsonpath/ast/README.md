# @jsonpath/ast

This package provides a comprehensive set of feature-agnostic TypeScript types for representing a JSONPath Abstract Syntax Tree (AST). It is a foundational component for any tool that needs to parse, analyze, or manipulate JSONPath expressions.

## Features

- **Feature-Agnostic**: The AST nodes are designed to be independent of any specific JSONPath implementation, making them universally applicable.
- **TypeScript Native**: Fully written in TypeScript, providing strong typing and excellent developer experience.
- **Visitor Pattern**: Includes a visitor utility to easily traverse and inspect the AST.

## Installation

```bash
pnpm add @jsonpath/ast
```

## Usage

The primary export of this package is a collection of type definitions for AST nodes. You can use these types to build your own JSONPath tools.

### AST Node Types

The core of the package is the set of AST node types, which represent the different parts of a JSONPath expression.

```typescript
import type { JsonPathAst, NameSelectorNode } from '@jsonpath/ast';

// Example of using the types
const myAst: JsonPathAst = {
	kind: 'Path',
	scope: 'root',
	segments: [
		{
			kind: 'Segment',
			selectors: [
				{
					kind: 'Selector:Name',
					name: 'store',
				} as NameSelectorNode,
			],
		},
	],
	singular: true,
};
```

### Visitor

A visitor function is provided to traverse the AST.

```typescript
import { visitPath, type Visitor } from '@jsonpath/ast';
import type { JsonPathAst } from '@jsonpath/ast';

const ast: JsonPathAst = /* ... */;

const visitor: Visitor = {
  Path: (node) => {
    console.log('Visiting Path:', node);
  },
  Segment: (node) => {
    console.log('Visiting Segment:', node);
  },
  Selector: (node) => {
    console.log('Visiting Selector:', node);
  },
};

visitPath(ast, visitor);
```

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../../CONTRIBUTING.md) for more information.

## License

[MIT](../../../LICENSE)
