# @jsonpath/parser

> Pratt parser for JSONPath expressions, producing a well-typed Abstract Syntax Tree (AST).

## Overview

`@jsonpath/parser` transforms JSONPath query strings into an Abstract Syntax Tree (AST) that can be traversed, transformed, or evaluated. It uses the Pratt parsing algorithm for efficient expression parsing with correct operator precedence.

## Features

- **Pratt Parsing**: Handles operator precedence elegantly
- **Complete AST**: Full representation of JSONPath queries
- **RFC 9535 Compliant**: Validates queries according to the spec
- **Tree Utilities**: Walk and transform AST nodes
- **Helpful Errors**: Position-accurate syntax errors

## Installation

```bash
pnpm add @jsonpath/parser
```

## API Reference

### parse()

Parse a JSONPath query string into an AST:

```typescript
import { parse } from '@jsonpath/parser';

const ast = parse('$.store.book[?(@.price < 20)].title');
console.log(ast.type); // 'Query'
console.log(ast.segments.length); // 3
```

### Parser Class

For more control over parsing:

```typescript
import { Parser } from '@jsonpath/parser';
import { Lexer } from '@jsonpath/lexer';

// From string
const parser1 = new Parser('$.store.book[*]');
const ast1 = parser1.parse();

// From existing lexer
const lexer = new Lexer('$.store.book[*]');
const parser2 = new Parser(lexer);
const ast2 = parser2.parse();
```

---

## AST Node Types

### NodeType Enum

```typescript
enum NodeType {
	// Root
	Query = 'Query',

	// Segments
	ChildSegment = 'ChildSegment',
	DescendantSegment = 'DescendantSegment',

	// Selectors
	NameSelector = 'NameSelector',
	IndexSelector = 'IndexSelector',
	WildcardSelector = 'WildcardSelector',
	SliceSelector = 'SliceSelector',
	FilterSelector = 'FilterSelector',

	// Expressions
	BinaryExpr = 'BinaryExpr',
	UnaryExpr = 'UnaryExpr',
	FunctionCall = 'FunctionCall',
	Literal = 'Literal',
}
```

### QueryNode

The root node of every parsed query:

```typescript
interface QueryNode extends ASTNode {
	readonly type: NodeType.Query;
	readonly root: boolean; // true = $, false = @
	readonly segments: SegmentNode[];
}
```

**Example:**

```typescript
const ast = parse('$.store.book');
// QueryNode {
//   type: 'Query',
//   root: true,
//   segments: [ChildSegment, ChildSegment]
// }
```

### SegmentNode

Represents a path segment (child or descendant):

```typescript
interface SegmentNode extends ASTNode {
	readonly type: NodeType.ChildSegment | NodeType.DescendantSegment;
	readonly selectors: SelectorNode[];
}
```

| Type                | JSONPath                 | Description         |
| ------------------- | ------------------------ | ------------------- |
| `ChildSegment`      | `.name`, `[selector]`    | Direct child access |
| `DescendantSegment` | `..name`, `..[selector]` | Recursive descent   |

### Selector Nodes

#### NameSelector

```typescript
interface NameSelectorNode extends ASTNode {
	readonly type: NodeType.NameSelector;
	readonly name: string;
}
```

Matches: `$.store`, `$["property name"]`, `$['with spaces']`

#### IndexSelector

```typescript
interface IndexSelectorNode extends ASTNode {
	readonly type: NodeType.IndexSelector;
	readonly index: number;
}
```

Matches: `$[0]`, `$[-1]`

#### WildcardSelector

```typescript
interface WildcardSelectorNode extends ASTNode {
	readonly type: NodeType.WildcardSelector;
}
```

Matches: `$[*]`, `$.*`

#### SliceSelector

```typescript
interface SliceSelectorNode extends ASTNode {
	readonly type: NodeType.SliceSelector;
	readonly start: number | null;
	readonly end: number | null;
	readonly step: number | null;
}
```

Matches: `$[1:5]`, `$[::2]`, `$[::-1]`

#### FilterSelector

```typescript
interface FilterSelectorNode extends ASTNode {
	readonly type: NodeType.FilterSelector;
	readonly expression: ExpressionNode;
}
```

Matches: `$[?(@.price < 20)]`, `$[?(@.active == true)]`

### Expression Nodes

#### BinaryExpr

```typescript
interface BinaryExprNode extends ASTNode {
	readonly type: NodeType.BinaryExpr;
	readonly operator: string; // '==', '!=', '<', '<=', '>', '>=', '&&', '||'
	readonly left: ExpressionNode;
	readonly right: ExpressionNode;
}
```

#### UnaryExpr

```typescript
interface UnaryExprNode extends ASTNode {
	readonly type: NodeType.UnaryExpr;
	readonly operator: string; // '!'
	readonly operand: ExpressionNode;
}
```

#### FunctionCall

```typescript
interface FunctionCallNode extends ASTNode {
	readonly type: NodeType.FunctionCall;
	readonly name: string;
	readonly args: ExpressionNode[];
}
```

#### Literal

```typescript
interface LiteralNode extends ASTNode {
	readonly type: NodeType.Literal;
	readonly value: string | number | boolean | null;
}
```

---

## Operator Precedence

The parser handles operators with the following precedence (higher binds tighter):

| Precedence | Operators            | Associativity |
| ---------- | -------------------- | ------------- |
| 10         | `\|\|`               | Left          |
| 20         | `&&`                 | Left          |
| 30         | `==`, `!=`           | Left          |
| 40         | `<`, `<=`, `>`, `>=` | Left          |

**Example:**

```typescript
// This query:
parse('$[?(@.a == 1 || @.b == 2 && @.c == 3)]');

// Parses as: (a == 1) || ((b == 2) && (c == 3))
// Because && has higher precedence than ||
```

---

## AST Traversal

### walk()

Traverse an AST with a visitor pattern:

```typescript
import { parse, walk, NodeType } from '@jsonpath/parser';

const ast = parse('$.store.book[?(@.price < 20)]');

walk(ast, {
	[NodeType.NameSelector]: (node, parent) => {
		console.log(`Name selector: ${node.name}`);
	},
	[NodeType.FunctionCall]: (node, parent) => {
		console.log(`Function call: ${node.name}`);
	},
	[NodeType.BinaryExpr]: (node, parent) => {
		console.log(`Binary expression: ${node.operator}`);
	},
});

// Output:
// Name selector: store
// Name selector: book
// Binary expression: <
// Name selector: price
```

### transform()

Transform an AST by returning modified nodes:

```typescript
import { parse, transform, NodeType } from '@jsonpath/parser';

const ast = parse('$.a.b.c');

// Remove all descendant segments
const simplified = transform(ast, {
	[NodeType.DescendantSegment]: (node) => ({
		...node,
		type: NodeType.ChildSegment,
	}),
});
```

---

## Singular Queries

RFC 9535 defines "singular queries" - queries that can only return at most one result:

```typescript
import { parse, isSingularQuery } from '@jsonpath/parser';

isSingularQuery(parse('$')); // true - root only
isSingularQuery(parse('$.a')); // true - single name
isSingularQuery(parse('$.a.b')); // true - chain of names
isSingularQuery(parse('$[0]')); // true - single index
isSingularQuery(parse('$.a[0].b')); // true - names and indices

isSingularQuery(parse('$.a[*]')); // false - wildcard
isSingularQuery(parse('$..a')); // false - descendant
isSingularQuery(parse('$.a[0:5]')); // false - slice
isSingularQuery(parse('$.a[?(@.x)]')); // false - filter
isSingularQuery(parse('$[0, 1]')); // false - union
```

Singular queries are significant for comparison semantics in filter expressions.

---

## Usage Examples

### Analyzing Query Structure

```typescript
import { parse, NodeType } from '@jsonpath/parser';

function analyzeQuery(path: string) {
	const ast = parse(path);

	const stats = {
		segments: ast.segments.length,
		hasDescendant: false,
		hasWildcard: false,
		hasFilter: false,
		hasSlice: false,
	};

	for (const segment of ast.segments) {
		if (segment.type === NodeType.DescendantSegment) {
			stats.hasDescendant = true;
		}
		for (const selector of segment.selectors) {
			switch (selector.type) {
				case NodeType.WildcardSelector:
					stats.hasWildcard = true;
					break;
				case NodeType.FilterSelector:
					stats.hasFilter = true;
					break;
				case NodeType.SliceSelector:
					stats.hasSlice = true;
					break;
			}
		}
	}

	return stats;
}

console.log(analyzeQuery('$.store.book[?(@.price < 20)]'));
// { segments: 3, hasDescendant: false, hasWildcard: false, hasFilter: true, hasSlice: false }
```

### Finding Function Calls

```typescript
import { parse, walk, NodeType, FunctionCallNode } from '@jsonpath/parser';

function findFunctions(path: string): string[] {
	const ast = parse(path);
	const functions: string[] = [];

	walk(ast, {
		[NodeType.FunctionCall]: (node: FunctionCallNode) => {
			functions.push(node.name);
		},
	});

	return functions;
}

console.log(
	findFunctions('$[?(length(@.items) > 0 && match(@.name, ".*test.*"))]'),
);
// ['length', 'match']
```

### Query Validation

```typescript
import { parse } from '@jsonpath/parser';
import { JSONPathSyntaxError } from '@jsonpath/core';

function validateQuery(path: string): { valid: boolean; error?: string } {
	try {
		parse(path);
		return { valid: true };
	} catch (err) {
		if (err instanceof JSONPathSyntaxError) {
			return { valid: false, error: err.message };
		}
		throw err;
	}
}

console.log(validateQuery('$.store.book[*]')); // { valid: true }
console.log(validateQuery('$.store[')); // { valid: false, error: '...' }
```

---

## Error Handling

The parser throws `JSONPathSyntaxError` for invalid queries:

```typescript
import { parse } from '@jsonpath/parser';
import { JSONPathSyntaxError } from '@jsonpath/core';

try {
	parse('$[1.5]'); // Non-integer index
} catch (err) {
	if (err instanceof JSONPathSyntaxError) {
		console.log(err.message); // 'Integer must be an integer'
		console.log(err.position); // Position of the error
	}
}
```

**Common Parser Errors:**

| Error                                    | Cause                           |
| ---------------------------------------- | ------------------------------- |
| Expected $ or @                          | Query doesn't start with root   |
| Whitespace not allowed in shorthand      | Space between `.` and name      |
| Integer cannot be -0                     | Index selector is `-0`          |
| Integer must be an integer               | Non-integer like `1.5` or `1e2` |
| Integer out of range                     | Beyond safe integer range       |
| Slice step cannot be 0                   | `$[::0]`                        |
| Literals not allowed as top-level filter | `$[?42]` without comparison     |
