# @jsonpath/parser

This package provides a feature-agnostic and extensible infrastructure for parsing JSONPath expressions into an Abstract Syntax Tree (AST). It is designed to be used in conjunction with `@jsonpath/lexer` and `@jsonpath/ast`.

## Features

- **Extensible**: Register custom segment parsers to support different JSONPath dialects and extensions.
- **Pratt Parser**: Utilizes a Pratt parser for efficient and elegant handling of operator precedence in filter expressions.
- **Feature-Agnostic**: The core parser is not tied to any specific JSONPath implementation.
- **TypeScript Native**: Fully written in TypeScript for a type-safe and robust developer experience.

## Installation

```bash
pnpm add @jsonpath/parser
```

## Usage

The main component of this package is the `JsonPathParser`.

### `JsonPathParser`

The `JsonPathParser` is used to parse a stream of tokens (from `@jsonpath/lexer`) into an AST (from `@jsonpath/ast`). You can register custom segment parsers to extend its functionality.

```typescript
import { JsonPathParser, type SegmentParser } from '@jsonpath/parser';
import type { ParserContext } from '@jsonpath/parser';
import type { PathNode } from '@jsonpath/ast';
import { TokenStream } from '@jsonpath/lexer';

// Create a new parser
const parser = new JsonPathParser();

// Register a custom segment parser (optional)
const mySegmentParser: SegmentParser = (ctx: ParserContext): PathNode | null => {
  // ... your parsing logic here
  return null;
};
parser.registerSegmentParser(mySegmentParser);

// Create a token stream
const tokens = /* from @jsonpath/lexer */;
const stream = new TokenStream(tokens);

// Parse the expression
const ast = parser.parse({ input: '...', tokens: stream });
```

### Pratt Parser

This package also exposes the underlying Pratt parser components, allowing you to build your own expression parsers.

## Contributing

Contributions are welcome! Please see the [contributing guidelines](../../../CONTRIBUTING.md) for more information.

## License

[MIT](../../../LICENSE)
