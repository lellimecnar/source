# @jsonpath/\* Library Specification

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Principles](#2-design-principles)
3. [Architecture Overview](#3-architecture-overview)
4. [Package Specifications](#4-package-specifications)
   - 4.1 [@jsonpath/core](#41-jsonpathcore)
   - 4.2 [@jsonpath/lexer](#42-jsonpathlexer)
   - 4.3 [@jsonpath/parser](#43-jsonpathparser)
   - 4.4 [@jsonpath/functions](#44-jsonpathfunctions)
   - 4.5 [@jsonpath/evaluator](#45-jsonpathevaluator)
   - 4.6 [@jsonpath/compiler](#46-jsonpathcompiler)
   - 4.7 [@jsonpath/pointer](#47-jsonpathpointer)
   - 4.8 [@jsonpath/patch](#48-jsonpathpatch)
   - 4.9 [@jsonpath/jsonpath](#49-jsonpathjsonpath)
   - 4.10 [@jsonpath/merge-patch](#410-jsonpathmerge-patch)
5. [Plugin Specifications](#5-plugin-specifications)
   - 5.1 [Plugin Interface](#51-plugin-interface)
   - 5.2 [@jsonpath/plugin-extended](#52-jsonpathplugin-extended)
   - 5.3 [@jsonpath/plugin-types](#53-jsonpathplugin-types)
   - 5.4 [@jsonpath/plugin-arithmetic](#54-jsonpathplugin-arithmetic)
   - 5.5 [@jsonpath/plugin-extras](#55-jsonpathplugin-extras)
   - 5.6 [@jsonpath/plugin-path-builder](#56-jsonpathplugin-path-builder)
6. [RFC Compliance](#6-rfc-compliance)
7. [Type System](#7-type-system)
8. [Error Handling](#8-error-handling)
9. [Performance Requirements](#9-performance-requirements)
10. [Testing Requirements](#10-testing-requirements)
11. [Build Configuration](#11-build-configuration)
12. [Migration Guide](#12-migration-guide)
13. [API Reference](#13-api-reference)

---

## 1. Executive Summary

### 1.1 Purpose

The `@jsonpath/*` library suite provides a modular, high-performance implementation of:

- **JSONPath** (RFC 9535) — Query expressions for JSON
- **JSON Pointer** (RFC 6901) — String syntax for identifying values
- **JSON Patch** (RFC 6902) — Operations for modifying JSON documents
- **JSON Merge Patch** (RFC 7386) — Simplified partial update format

### 1.2 Goals

| Goal                    | Target                 | Measurement             |
| ----------------------- | ---------------------- | ----------------------- |
| **Zero Dependencies**   | 0 external packages    | Package audit           |
| **Minimal Bundle**      | <15KB gzipped (full)   | Bundle analysis         |
| **High Performance**    | >5M ops/sec (compiled) | Benchmark suite         |
| **Full RFC Compliance** | 100% spec conformance  | Compliance test suite   |
| **Tree-Shakeable**      | Unused code eliminated | Bundle analysis         |
| **TypeScript-First**    | Complete type coverage | `strict` mode, no `any` |

### 1.3 Non-Goals

- Browser polyfills (targets ES2020+)
- Legacy Node.js support (<18.0.0)
- Streaming JSON parsing (operates on parsed JSON)
- JSON Schema validation

### 1.4 Target Environments

```
Node.js: >=18.0.0
Browsers: ES2020+ (Chrome 80+, Firefox 74+, Safari 14+, Edge 80+)
TypeScript: >=5.0.0
Module Systems: ESM (primary), CJS (generated)
```

---

## 2. Design Principles

### 2.1 Modularity

Each package serves a single, well-defined purpose. Consumers import only what they need.

```typescript
// Minimal: just pointer operations
import { resolve } from '@jsonpath/pointer';

// Standard: query + pointer + patch
import { query, resolve, apply } from '@jsonpath/jsonpath';

// Full: with plugins
import { configure, query } from '@jsonpath/jsonpath';
import extended from '@jsonpath/plugin-extended';
```

### 2.2 Immutability by Default

All mutation operations return new objects. The original data is never modified.

```typescript
const original = { a: 1 };
const modified = set('/b', original, 2);
// original === { a: 1 }
// modified === { a: 1, b: 2 }
```

### 2.3 Fail-Fast with Clear Errors

Invalid inputs throw immediately with actionable error messages.

```typescript
// Bad: silent failure
resolve('/invalid', null); // Returns undefined silently

// Good: explicit error
resolve('/invalid', null); // Throws JSONPathError with context
```

### 2.4 Performance by Design

Performance is a feature, not an afterthought. Critical paths are optimized:

- Lexer uses ASCII lookup tables
- Parser uses Pratt algorithm (minimal call depth)
- Compiled queries generate optimized JavaScript
- Object shapes are monomorphic for V8 optimization

### 2.5 Extensibility Without Complexity

The plugin system is intentionally simple:

```typescript
// Plugin is just an object with a setup function
const myPlugin: Plugin = {
  name: 'my-plugin',
  setup(ctx) {
    ctx.registerFunction({ ... });
  }
};
```

---

## 3. Architecture Overview

### 3.1 Package Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                    @jsonpath/jsonpath                        │
│                    (main entrypoint)                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
      ┌───────────────────────┼───────────────────────┐
      │                       │                       │
      ▼                       ▼                       ▼
┌───────────┐         ┌─────────────┐         ┌─────────────┐
│ evaluator │         │  compiler   │         │    patch    │
└─────┬─────┘         └──────┬──────┘         └──────┬──────┘
      │                      │                       │
      └──────────┬───────────┘                       │
                 │                                   │
                 ▼                                   ▼
          ┌─────────────┐                    ┌─────────────┐
          │   parser    │                    │   pointer   │
          └──────┬──────┘                    └──────┬──────┘
                 │                                  │
      ┌──────────┼──────────┐                      │
      │          │          │                      │
      ▼          ▼          ▼                      │
┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  lexer  │ │functions│ │  core   │◄──────────────┘
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┴───────────┘
                 │
                 ▼
          ┌─────────────┐
          │    core     │
          │ (foundation)│
          └─────────────┘
                 ▲
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───────┐  ┌───────────┐  ┌───────┐
│plugin-│  │  plugin-  │  │plugin-│
│extended│ │  types    │  │extras │
└───────┘  └───────────┘  └───────┘
```

### 3.2 Data Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Input   │───▶│  Lexer   │───▶│  Parser  │───▶│   AST    │
│  String  │    │ (tokens) │    │  (Pratt) │    │  (tree)  │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                     │
                                    ┌────────────────┴────────────────┐
                                    │                                 │
                                    ▼                                 ▼
                             ┌─────────────┐                  ┌─────────────┐
                             │  Evaluator  │                  │  Compiler   │
                             │(interpreter)│                  │   (JIT)     │
                             └──────┬──────┘                  └──────┬──────┘
                                    │                                │
                                    ▼                                ▼
                             ┌─────────────┐                  ┌─────────────┐
                             │   Results   │                  │  Function   │
                             │  (direct)   │                  │  (cached)   │
                             └─────────────┘                  └─────────────┘
```

### 3.3 Bundle Size Budget

| Package                       | Budget (gzipped) | Priority |
| ----------------------------- | ---------------- | -------- |
| @jsonpath/core                | 1.5KB            | P0       |
| @jsonpath/lexer               | 2.0KB            | P0       |
| @jsonpath/parser              | 3.0KB            | P0       |
| @jsonpath/functions           | 1.0KB            | P0       |
| @jsonpath/evaluator           | 2.5KB            | P0       |
| @jsonpath/compiler            | 2.0KB            | P1       |
| @jsonpath/pointer             | 1.0KB            | P0       |
| @jsonpath/patch               | 2.5KB            | P1       |
| @jsonpath/merge-patch         | 0.8KB            | P1       |
| @jsonpath/jsonpath            | 0.7KB            | P0       |
| **Total (core packages)**     | **17KB**         | —        |
| @jsonpath/plugin-extended     | 0.5KB            | P2       |
| @jsonpath/plugin-types        | 0.5KB            | P2       |
| @jsonpath/plugin-arithmetic   | 0.3KB            | P2       |
| @jsonpath/plugin-extras       | 1.0KB            | P2       |
| @jsonpath/plugin-path-builder | 0.8KB            | P2       |
| **Total (with all plugins)**  | **20KB**         | —        |

---

## 4. Package Specifications

### 4.1 @jsonpath/core

**Purpose**: Foundation types, registries, utilities, and error classes.

**Dependencies**: None

**Exports**:

```typescript
// Types
export type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| { [key: string]: JSONValue };

export type JSONPrimitive = string | number | boolean | null;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

export type PathSegment = string | number;
export type Path = readonly PathSegment[];

// Query result types
export interface QueryNode<T = unknown> {
	readonly value: T;
	readonly path: Path;
	readonly root: unknown;
	/** Parent object/array containing this node */
	readonly parent?: unknown;
	/** Property name or index in parent */
	readonly parentKey?: PathSegment;
}

export interface QueryResult<T = unknown> extends Iterable<QueryNode<T>> {
	/** Extract all values */
	values(): T[];

	/** Extract all paths as segment arrays */
	paths(): PathSegment[][];

	/** Extract all paths as JSON Pointer strings */
	pointers(): string[];

	/** Extract all paths as RFC 9535 Normalized Path strings */
	normalizedPaths(): string[];

	/** Get all nodes */
	nodes(): QueryNode<T>[];

	/** Get first node or undefined */
	first(): QueryNode<T> | undefined;

	/** Get last node or undefined */
	last(): QueryNode<T> | undefined;

	/** Check if result set is empty */
	isEmpty(): boolean;

	/** Get result count */
	readonly length: number;

	/** Map values through a transform function */
	map<U>(fn: (value: T, node: QueryNode<T>) => U): U[];

	/** Filter nodes by predicate */
	filter(fn: (value: T, node: QueryNode<T>) => boolean): QueryResult<T>;

	/** Execute callback for each node */
	forEach(fn: (value: T, node: QueryNode<T>) => void): void;

	/** Get parents of all matched nodes */
	parents(): QueryResult<unknown>;
}

// Registry types
export interface FunctionDefinition<
	TArgs extends unknown[] = unknown[],
	TReturn = unknown,
> {
	readonly name: string;
	readonly signature: readonly ParameterType[];
	readonly returns: ReturnType;
	readonly evaluate: (...args: TArgs) => TReturn;
}

export interface SelectorDefinition {
	readonly name: string;
	readonly parse: (lexer: LexerInterface) => SelectorNode | null;
	readonly evaluate: (
		node: QueryNode,
		ctx: EvaluationContext,
	) => Iterable<QueryNode>;
}

export interface OperatorDefinition {
	readonly symbol: string;
	readonly precedence: number;
	readonly associativity: 'left' | 'right';
	readonly evaluate: (left: unknown, right: unknown) => unknown;
}

export type ParameterType = 'ValueType' | 'LogicalType' | 'NodesType';
export type ReturnType = 'ValueType' | 'LogicalType' | 'NodesType';

// Registries (singleton Maps)
export const functionRegistry: Map<string, FunctionDefinition>;
export const selectorRegistry: Map<string, SelectorDefinition>;
export const operatorRegistry: Map<string, OperatorDefinition>;

// Errors
export class JSONPathError extends Error {
	readonly code: ErrorCode;
	readonly position?: number;
	readonly path?: string;
	readonly cause?: Error;
}

export class JSONPathSyntaxError extends JSONPathError {}
export class JSONPathTypeError extends JSONPathError {}
export class JSONPathReferenceError extends JSONPathError {}
export class JSONPointerError extends JSONPathError {}
export class JSONPatchError extends JSONPathError {}

export type ErrorCode =
	| 'SYNTAX_ERROR'
	| 'TYPE_ERROR'
	| 'REFERENCE_ERROR'
	| 'POINTER_ERROR'
	| 'PATCH_ERROR'
	| 'FUNCTION_ERROR'
	| 'INVALID_ARGUMENT';

// Utility functions
export function isObject(value: unknown): value is JSONObject;
export function isArray(value: unknown): value is JSONArray;
export function isPrimitive(value: unknown): value is JSONPrimitive;
export function deepEqual(a: unknown, b: unknown): boolean;
export function deepClone<T>(value: T): T;
export function freeze<T>(value: T): Readonly<T>;
```

**Implementation Notes**:

1. **Registries** are `Map` instances for O(1) lookup
2. **deepEqual** must handle circular references gracefully (return false)
3. **deepClone** should use structured clone where available, fallback to recursive copy
4. **freeze** applies `Object.freeze` recursively

---

### 4.2 @jsonpath/lexer

**Purpose**: Tokenize JSONPath query strings into a token stream.

**Dependencies**: `@jsonpath/core`

**Exports**:

```typescript
// Token types enum
export const enum TokenType {
	// Structural
	ROOT = 'ROOT', // $
	CURRENT = 'CURRENT', // @
	DOT = 'DOT', // .
	DOT_DOT = 'DOT_DOT', // ..
	LBRACKET = 'LBRACKET', // [
	RBRACKET = 'RBRACKET', // ]
	LPAREN = 'LPAREN', // (
	RPAREN = 'RPAREN', // )
	COMMA = 'COMMA', // ,
	COLON = 'COLON', // :
	WILDCARD = 'WILDCARD', // *
	FILTER = 'FILTER', // ?

	// Literals
	STRING = 'STRING', // 'foo' or "foo"
	NUMBER = 'NUMBER', // 42, -3.14, 1e10
	TRUE = 'TRUE', // true
	FALSE = 'FALSE', // false
	NULL = 'NULL', // null

	// Identifiers
	IDENT = 'IDENT', // unquoted names

	// Comparison operators
	EQ = 'EQ', // ==
	NE = 'NE', // !=
	LT = 'LT', // <
	LE = 'LE', // <=
	GT = 'GT', // >
	GE = 'GE', // >=

	// Logical operators
	AND = 'AND', // &&
	OR = 'OR', // ||
	NOT = 'NOT', // !

	// Special
	EOF = 'EOF',
	ERROR = 'ERROR',
}

export interface Token {
	readonly type: TokenType;
	readonly value: string | number | boolean | null;
	readonly start: number;
	readonly end: number;
	readonly line: number;
	readonly column: number;
}

export interface LexerInterface {
	/** Get next token and advance */
	next(): Token;

	/** Peek at next token without advancing */
	peek(): Token;

	/** Peek at token N positions ahead */
	peekAhead(n: number): Token;

	/** Check if at end of input */
	isAtEnd(): boolean;

	/** Get current position */
	readonly position: number;

	/** Get input string */
	readonly input: string;
}

export class Lexer implements LexerInterface {
	constructor(input: string);
	next(): Token;
	peek(): Token;
	peekAhead(n: number): Token;
	isAtEnd(): boolean;
	readonly position: number;
	readonly input: string;
}

// Factory function (recommended for tree-shaking)
export function createLexer(input: string): Lexer;

// Utility: tokenize entire input
export function tokenize(input: string): Token[];
```

**Implementation Requirements**:

1. **ASCII Lookup Table**:

```typescript
const CHAR_FLAGS = new Uint8Array(128);
const IS_WHITESPACE = 1 << 0;
const IS_DIGIT = 1 << 1;
const IS_IDENT_START = 1 << 2;
const IS_IDENT_CONT = 1 << 3;
const IS_OPERATOR = 1 << 4;
```

2. **Character Code Constants**:

```typescript
const CH_DOLLAR = 36; // $
const CH_AT = 64; // @
const CH_DOT = 46; // .
const CH_LBRACKET = 91; // [
const CH_RBRACKET = 93; // ]
const CH_LPAREN = 40; // (
const CH_RPAREN = 41; // )
// ... etc
```

3. **String Escape Sequences**:

```
\\  → \
\'  → '
\"  → "
\n  → newline
\r  → carriage return
\t  → tab
\b  → backspace
\f  → form feed
\uXXXX → Unicode code point
```

4. **Number Formats**:

```
Integer: 0, 42, -17
Decimal: 3.14, -0.5, .25
Scientific: 1e10, 2.5E-3, -1e+5
```

5. **Error Recovery**: On invalid character, emit ERROR token and advance.

---

### 4.3 @jsonpath/parser

**Purpose**: Parse token stream into Abstract Syntax Tree.

**Dependencies**: `@jsonpath/core`, `@jsonpath/lexer`

**Exports**:

```typescript
// AST Node Types
export const enum NodeType {
	// Root
	Query = 'Query',

	// Segments
	ChildSegment = 'ChildSegment',
	DescendantSegment = 'DescendantSegment',

	// Selectors
	RootSelector = 'RootSelector',
	CurrentSelector = 'CurrentSelector',
	NameSelector = 'NameSelector',
	IndexSelector = 'IndexSelector',
	WildcardSelector = 'WildcardSelector',
	SliceSelector = 'SliceSelector',
	FilterSelector = 'FilterSelector',

	// Expressions
	BinaryExpr = 'BinaryExpr',
	UnaryExpr = 'UnaryExpr',
	LogicalExpr = 'LogicalExpr',
	ComparisonExpr = 'ComparisonExpr',
	FunctionCall = 'FunctionCall',
	Literal = 'Literal',
	SingularQuery = 'SingularQuery',
	FilterQuery = 'FilterQuery',
}

// Base AST node
export interface ASTNode {
	readonly type: NodeType;
	readonly start: number;
	readonly end: number;
}

// Query (root node)
export interface QueryNode extends ASTNode {
	readonly type: NodeType.Query;
	readonly segments: SegmentNode[];
	readonly raw: string;
}

// Segments
export interface SegmentNode extends ASTNode {
	readonly selectors: SelectorNode[];
	readonly isDescendant: boolean;
}

// Selectors
export interface NameSelectorNode extends ASTNode {
	readonly type: NodeType.NameSelector;
	readonly name: string;
	readonly quoted: boolean;
}

export interface IndexSelectorNode extends ASTNode {
	readonly type: NodeType.IndexSelector;
	readonly index: number;
}

export interface WildcardSelectorNode extends ASTNode {
	readonly type: NodeType.WildcardSelector;
}

export interface SliceSelectorNode extends ASTNode {
	readonly type: NodeType.SliceSelector;
	readonly start: number | null;
	readonly end: number | null;
	readonly step: number | null;
}

export interface FilterSelectorNode extends ASTNode {
	readonly type: NodeType.FilterSelector;
	readonly expression: ExpressionNode;
}

export type SelectorNode =
	| NameSelectorNode
	| IndexSelectorNode
	| WildcardSelectorNode
	| SliceSelectorNode
	| FilterSelectorNode;

// Expressions
export interface BinaryExprNode extends ASTNode {
	readonly type: NodeType.BinaryExpr;
	readonly operator: BinaryOperator;
	readonly left: ExpressionNode;
	readonly right: ExpressionNode;
}

export interface UnaryExprNode extends ASTNode {
	readonly type: NodeType.UnaryExpr;
	readonly operator: UnaryOperator;
	readonly operand: ExpressionNode;
}

export interface FunctionCallNode extends ASTNode {
	readonly type: NodeType.FunctionCall;
	readonly name: string;
	readonly args: ExpressionNode[];
}

export interface LiteralNode extends ASTNode {
	readonly type: NodeType.Literal;
	readonly value: string | number | boolean | null;
	readonly raw: string;
}

export interface SingularQueryNode extends ASTNode {
	readonly type: NodeType.SingularQuery;
	readonly root: boolean; // true = $, false = @
	readonly segments: SegmentNode[];
}

export type ExpressionNode =
	| BinaryExprNode
	| UnaryExprNode
	| FunctionCallNode
	| LiteralNode
	| SingularQueryNode;

export type BinaryOperator =
	| '=='
	| '!='
	| '<'
	| '<='
	| '>'
	| '>='
	| '&&'
	| '||';

export type UnaryOperator = '!';

// Parser class
export class Parser {
	constructor(lexer: LexerInterface, options?: ParserOptions);

	/** Parse complete query */
	parse(): QueryNode;

	/** Parse single expression (for testing/debugging) */
	parseExpression(): ExpressionNode;
}

export interface ParserOptions {
	/** Allow extended selectors from plugins */
	allowExtensions?: boolean;

	/** Strict RFC 9535 mode (no extensions) */
	strict?: boolean;
}

// Factory functions
export function parse(input: string, options?: ParserOptions): QueryNode;
export function parseExpression(input: string): ExpressionNode;

// AST utilities
export function walk(node: ASTNode, visitor: ASTVisitor): void;

export function transform<T extends ASTNode>(
	node: T,
	transformer: ASTTransformer,
): T;

export interface ASTVisitor {
	enter?(node: ASTNode, parent: ASTNode | null): void;
	leave?(node: ASTNode, parent: ASTNode | null): void;
	[NodeType.Query]?(node: QueryNode): void;
	[NodeType.NameSelector]?(node: NameSelectorNode): void;
	// ... etc for each node type
}

export interface ASTTransformer {
	[NodeType.Query]?(node: QueryNode): QueryNode;
	// ... etc
}
```

**Parser Implementation Requirements**:

1. **Pratt Parser for Expressions**:

```typescript
// Operator precedence (binding power)
const PRECEDENCE: Record<string, [number, number]> = {
	'||': [10, 11], // left-associative
	'&&': [20, 21], // left-associative
	'==': [30, 31],
	'!=': [30, 31],
	'<': [40, 41],
	'<=': [40, 41],
	'>': [40, 41],
	'>=': [40, 41],
};

// Unary prefix operators
const PREFIX_PRECEDENCE: Record<string, number> = {
	'!': 50,
};
```

2. **Segment Parsing**:

```
Query       → '$' Segment*
Segment     → ChildSegment | DescendantSegment
ChildSegment → ('.' Shorthand) | ('[' Selectors ']')
DescendantSegment → '..' (Shorthand | '[' Selectors ']')
Shorthand   → '*' | MemberName
Selectors   → Selector (',' Selector)*
```

3. **Selector Parsing**:

```
Selector    → NameSelector | IndexSelector | SliceSelector
            | WildcardSelector | FilterSelector
NameSelector → STRING | IDENT
IndexSelector → NUMBER
SliceSelector → [NUMBER] ':' [NUMBER] [':' [NUMBER]]
WildcardSelector → '*'
FilterSelector → '?' Expression
```

4. **Expression Parsing**:

```
Expression  → LogicalOr
LogicalOr   → LogicalAnd ('||' LogicalAnd)*
LogicalAnd  → Comparison ('&&' Comparison)*
Comparison  → Unary (CompOp Unary)?
Unary       → '!' Unary | Primary
Primary     → Literal | FunctionCall | Query | '(' Expression ')'
```

5. **Error Recovery**: Parser should recover and continue after errors when possible, collecting all errors.

---

### 4.4 @jsonpath/functions

**Purpose**: RFC 9535 built-in filter functions.

**Dependencies**: `@jsonpath/core`

**Exports**:

```typescript
// Function definitions
export const lengthFunction: FunctionDefinition<[unknown], number | null>;
export const countFunction: FunctionDefinition<[QueryNode[]], number>;
export const matchFunction: FunctionDefinition<[unknown, unknown], boolean>;
export const searchFunction: FunctionDefinition<[unknown, unknown], boolean>;
export const valueFunction: FunctionDefinition<[QueryNode[]], unknown>;

// Registration
export function registerBuiltinFunctions(): void;

// Individual registrations (for selective imports)
export function registerLength(): void;
export function registerCount(): void;
export function registerMatch(): void;
export function registerSearch(): void;
export function registerValue(): void;

// Utility for custom function registration
export function registerFunction(def: FunctionDefinition): void;
export function unregisterFunction(name: string): boolean;
export function getFunction(name: string): FunctionDefinition | undefined;
export function hasFunction(name: string): boolean;
```

**Function Specifications**:

#### `length(value)`

```
Signature: (ValueType) → ValueType
Returns:
  - String: character count
  - Array: element count
  - Object: member count
  - Other: Nothing (null)
```

```typescript
length('hello'); // 5
length([1, 2, 3]); // 3
length({ a: 1, b: 2 }); // 2
length(42); // null
length(null); // null
```

#### `count(nodes)`

```
Signature: (NodesType) → ValueType
Returns: Number of nodes in nodelist
```

```typescript
count(@.items[*])   // Number of items
count(@.missing)    // 0
```

#### `match(string, pattern)`

```
Signature: (ValueType, ValueType) → LogicalType
Returns: true if string fully matches I-Regexp pattern
Pattern: RFC 9485 I-Regexp (subset of ECMA-262 RegExp)
```

```typescript
match('foobar', 'foo.*'); // true (full match)
match('foobar', 'foo'); // false (not full match)
match('foobar', 'f.*r'); // true
match(123, '\\d+'); // false (not a string)
```

#### `search(string, pattern)`

```
Signature: (ValueType, ValueType) → LogicalType
Returns: true if pattern matches anywhere in string
```

```typescript
search('foobar', 'oba'); // true
search('foobar', '^foo'); // true
search('foobar', 'baz'); // false
```

#### `value(nodes)`

```
Signature: (NodesType) → ValueType
Returns:
  - Single node: the node's value
  - Empty/multiple nodes: Nothing (null)
```

```typescript
value(@.name)           // "Alice" (single match)
value(@.items[*])       // null (multiple matches)
value(@.missing)        // null (no match)
```

**I-Regexp Compliance Notes**:

Per RFC 9485, I-Regexp is a subset of ECMA-262:

- Supported: `.` `*` `+` `?` `|` `()` `[]` `[^]` `\d` `\D` `\s` `\S` `\w` `\W` `{n}` `{n,}` `{n,m}`
- NOT supported: `^` `$` lookahead/lookbehind, backreferences, named groups
- Unicode: Must use Unicode mode (`u` flag)

Implementation should convert I-Regexp to JavaScript RegExp:

- `match`: Wrap pattern with `^(?:...)$`
- `search`: Use pattern directly

---

### 4.5 @jsonpath/evaluator

**Purpose**: Interpret AST directly against JSON data.

**Dependencies**: `@jsonpath/core`, `@jsonpath/parser`, `@jsonpath/functions`

**Exports**:

```typescript
export interface EvaluationContext {
  readonly root: unknown;
  readonly current: unknown;
  readonly path: Path;
  readonly options: EvaluatorOptions;
}

export interface EvaluatorOptions {
  /** Maximum recursion depth for descendant queries (default: 100) */
  maxDepth?: number;

  /** Maximum result count (default: Infinity) */
  maxResults?: number;

  /** Timeout in milliseconds (default: none) */
  timeout?: number;

  /** Maximum number of nodes to visit (default: 100000) */
  maxNodes?: number;

  /** Maximum filter expression depth (default: 10) */
  maxFilterDepth?: number;

  /** Throw on circular reference detection (default: true) */
  detectCircular?: boolean;
}

/** Security-focused options for untrusted queries */
export interface SecureQueryOptions extends EvaluatorOptions {
  /** Paths that are allowed (whitelist) */
  allowPaths?: string[];

  /** Paths that are blocked (blacklist) */
  blockPaths?: string[];

  /** Disallow recursive descent (..) */
  noRecursive?: boolean;

  /** Disallow filter expressions */
  noFilters?: boolean;

  /** Maximum query string length */
  maxQueryLength?: number;
}

export class Evaluator {
  constructor(options?: EvaluatorOptions);

  /** Evaluate query against data */
  evaluate<T = unknown>(ast: QueryNode, data: unknown): QueryResult<T>;

  /** Evaluate with streaming (generator) */
  *stream<T = unknown>(ast: QueryNode, data: unknown): Generator<QueryNode<T>>;
}

// Factory functions
export function evaluate<T = unknown>(
  ast: QueryNode,
  data: unknown,
  options?: EvaluatorOptions
): QueryResult<T>;

export function* stream<T = unknown>(
  ast: QueryNode,
  data: unknown,
  options?: EvaluatorOptions
): Generator<QueryNode<T>>;

// QueryResult implementation
export class QueryResultImpl<T> implements QueryResult<T> {
  constructor(nodes: QueryNode<T>[]);

  [Symbol.iterator](): Iterator<QueryNode<T>>;
  values(): T[];
  paths(): PathSegment[][];
  pointers(): string[];
  nodes(): QueryNode<T>[];
  first(): QueryNode<T> | undefined;
  isEmpty(): boolean;
  readonly length: number;
}
```

**Implementation Requirements**:

1. **Segment Evaluation**:

```typescript
function evaluateSegment(
	segment: SegmentNode,
	input: QueryNode[],
	ctx: EvaluationContext,
): QueryNode[] {
	const results: QueryNode[] = [];

	for (const node of input) {
		if (segment.isDescendant) {
			// Recursive descent - depth-first
			for (const descendant of recursiveDescend(node, ctx)) {
				for (const selector of segment.selectors) {
					results.push(...evaluateSelector(selector, descendant, ctx));
				}
			}
		} else {
			for (const selector of segment.selectors) {
				results.push(...evaluateSelector(selector, node, ctx));
			}
		}
	}

	return results;
}
```

2. **Recursive Descent**:

```typescript
function* recursiveDescend(
	node: QueryNode,
	ctx: EvaluationContext,
	depth = 0,
): Generator<QueryNode> {
	if (depth > ctx.options.maxDepth) {
		throw new JSONPathError(
			'Maximum recursion depth exceeded',
			'REFERENCE_ERROR',
		);
	}

	yield node;

	const value = node.value;
	if (isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			yield* recursiveDescend(
				{ value: value[i], path: [...node.path, i], root: node.root },
				ctx,
				depth + 1,
			);
		}
	} else if (isObject(value)) {
		for (const key of Object.keys(value)) {
			yield* recursiveDescend(
				{ value: value[key], path: [...node.path, key], root: node.root },
				ctx,
				depth + 1,
			);
		}
	}
}
```

3. **Slice Normalization** (RFC 9535 §2.3.4.2):

```typescript
function normalizeSlice(
	start: number | null,
	end: number | null,
	step: number | null,
	length: number,
): { start: number; end: number; step: number } {
	const s = step ?? 1;
	if (s === 0)
		throw new JSONPathError('Slice step cannot be zero', 'SYNTAX_ERROR');

	const normalize = (i: number | null, defaultVal: number): number => {
		if (i === null) return defaultVal;
		if (i < 0) return Math.max(length + i, s > 0 ? 0 : -1);
		return Math.min(i, s > 0 ? length : length - 1);
	};

	return {
		start: normalize(start, s > 0 ? 0 : length - 1),
		end: normalize(end, s > 0 ? length : -length - 1),
		step: s,
	};
}
```

4. **Filter Expression Evaluation**:

```typescript
function evaluateFilterExpr(
	expr: ExpressionNode,
	ctx: EvaluationContext,
): unknown {
	switch (expr.type) {
		case NodeType.Literal:
			return expr.value;

		case NodeType.SingularQuery:
			return evaluateSingularQuery(expr, ctx);

		case NodeType.BinaryExpr:
			return evaluateBinaryOp(
				expr.operator,
				evaluateFilterExpr(expr.left, ctx),
				evaluateFilterExpr(expr.right, ctx),
			);

		case NodeType.UnaryExpr:
			return !toLogicalType(evaluateFilterExpr(expr.operand, ctx));

		case NodeType.FunctionCall:
			return evaluateFunctionCall(expr, ctx);
	}
}
```

5. **Type Coercion**:

```typescript
// Convert to LogicalType for filter tests
function toLogicalType(value: unknown): boolean {
	if (typeof value === 'boolean') return value;
	if (Array.isArray(value)) return value.length > 0; // NodesType
	return value !== null && value !== undefined;
}

// Comparison requires same types
function compare(a: unknown, b: unknown): number | null {
	if (typeof a === 'number' && typeof b === 'number') {
		if (Number.isNaN(a) || Number.isNaN(b)) return null;
		return a - b;
	}
	if (typeof a === 'string' && typeof b === 'string') {
		return a.localeCompare(b);
	}
	return null; // Incomparable types
}
```

---

### 4.6 @jsonpath/compiler

**Purpose**: JIT compile AST to optimized JavaScript functions.

**Dependencies**: `@jsonpath/core`, `@jsonpath/parser`, `@jsonpath/functions`

**Exports**:

```typescript
export interface CompiledQuery<T = unknown> {
	(data: unknown): QueryResult<T>;

	/** Generated source code (for debugging) */
	readonly source: string;

	/** Original AST */
	readonly ast: QueryNode;

	/** Compilation time in ms */
	readonly compilationTime: number;
}

export interface CompilerOptions {
	/** Include source map comments */
	sourceMap?: boolean;

	/** Optimize for small result sets */
	optimizeForSmall?: boolean;

	/** Enable unsafe optimizations */
	unsafe?: boolean;
}

export class Compiler {
	constructor(options?: CompilerOptions);

	/** Compile AST to executable function */
	compile<T = unknown>(ast: QueryNode): CompiledQuery<T>;
}

// Factory function
export function compile<T = unknown>(
	ast: QueryNode,
	options?: CompilerOptions,
): CompiledQuery<T>;

// Compile from string
export function compileQuery<T = unknown>(
	query: string,
	options?: CompilerOptions,
): CompiledQuery<T>;
```

**Code Generation Requirements**:

1. **Generated Code Structure**:

```typescript
// Example for: $.store.book[?@.price > 10].title
`
const root = data;
let nodes = [{ value: data, path: [], root }];
let next;

// Segment 1: .store
next = [];
for (const node of nodes) {
  const v = node.value;
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    if ('store' in v) {
      next.push({ value: v['store'], path: [...node.path, 'store'], root });
    }
  }
}
nodes = next;

// Segment 2: .book
next = [];
for (const node of nodes) {
  const v = node.value;
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    if ('book' in v) {
      next.push({ value: v['book'], path: [...node.path, 'book'], root });
    }
  }
}
nodes = next;

// Segment 3: [?@.price > 10]
next = [];
for (const node of nodes) {
  const v = node.value;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const current = v[i];
      // Filter: @.price > 10
      const _f = current?.['price'];
      if (typeof _f === 'number' && _f > 10) {
        next.push({ value: current, path: [...node.path, i], root });
      }
    }
  }
}
nodes = next;

// Segment 4: .title
next = [];
for (const node of nodes) {
  const v = node.value;
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    if ('title' in v) {
      next.push({ value: v['title'], path: [...node.path, 'title'], root });
    }
  }
}
nodes = next;

return new QueryResult(nodes);
`;
```

2. **Optimization Strategies**:

- **Inline simple selectors**: Name and index selectors become direct property access
- **Avoid intermediate arrays**: When possible, stream directly to next stage
- **Hoist constants**: Extract string literals and numbers
- **Short-circuit filters**: Exit early on false conditions
- **Monomorphic guards**: Use consistent object shape checks

3. **Function Call Compilation**:

```typescript
// Functions are looked up at compile time but called at runtime
const fn = functions.get('length');
if (!fn) throw new Error('Unknown function');
// Generated code:
`_fn_length(${compileArg(arg)})`;
```

4. **Safe Property Access**:

```typescript
// Always guard against null/undefined
`(v !== null && typeof v === 'object' && 'key' in v) ? v['key'] : undefined`;
```

---

### 4.7 @jsonpath/pointer

**Purpose**: RFC 6901 JSON Pointer implementation.

**Dependencies**: `@jsonpath/core`

**Exports**:

```typescript
// Parsing
export function parse(pointer: string): PathSegment[];
export function stringify(path: readonly PathSegment[]): string;

// Validation
export function isValid(pointer: string): boolean;
export function validate(pointer: string): ValidationResult;

export interface ValidationResult {
	valid: boolean;
	error?: string;
	position?: number;
}

// Resolution
export function resolve<T = unknown>(
	pointer: string | PathSegment[],
	data: unknown,
): T | undefined;

export function resolveOrThrow<T = unknown>(
	pointer: string | PathSegment[],
	data: unknown,
): T;

export function exists(pointer: string | PathSegment[], data: unknown): boolean;

export interface ResolveWithParentResult<T = unknown> {
	value: T;
	parent: unknown;
	key: PathSegment;
}

export function resolveWithParent<T = unknown>(
	pointer: string | PathSegment[],
	data: unknown,
): ResolveWithParentResult<T> | undefined;

// Mutation (immutable - returns new objects)
export function set<T>(
	pointer: string | PathSegment[],
	data: T,
	value: unknown,
): T;

export function remove<T>(pointer: string | PathSegment[], data: T): T;

export function append<T>(
	pointer: string | PathSegment[],
	data: T,
	value: unknown,
): T;

// Relative JSON Pointer (RFC 6901 extension)
export function relative(
	from: string | PathSegment[],
	to: string | PathSegment[],
): string;

// Relative JSON Pointer (RFC 6901 Extension)
export function relative(
	from: string | PathSegment[],
	to: string | PathSegment[],
): string;

export function resolveRelative(
	pointer: string,
	relativePointer: string,
	data: unknown,
): unknown;

export class RelativePointer {
	constructor(relativePointer: string);

	/** Number of levels to go up (0 = current, 1 = parent, etc.) */
	readonly upLevels: number;

	/** Remaining path after going up */
	readonly remainder: PathSegment[];

	/** Whether this is an index reference (ends with #) */
	readonly isIndexReference: boolean;

	/** Resolve relative to an absolute pointer */
	resolve(basePointer: string, data: unknown): unknown;

	/** Convert to absolute pointer given base */
	toAbsolute(basePointer: string): string;
}

// Utilities
export function parent(pointer: string): string;
export function join(...pointers: string[]): string;
export function split(pointer: string): string[];
export function escape(token: string): string;
export function unescape(token: string): string;

// Normalized Path output (RFC 9535 format)
export function toNormalizedPath(pointer: string): string;
export function fromNormalizedPath(normalizedPath: string): string;
```

**Implementation Requirements**:

1. **Pointer Syntax** (RFC 6901 §3):

```
json-pointer    = *( "/" reference-token )
reference-token = *( unescaped / escaped )
unescaped       = %x00-2E / %x30-7D / %x7F-10FFFF
escaped         = "~" ( "0" / "1" )
```

2. **Escape Sequences**:

```
~0 → ~
~1 → /
```

Order matters: unescape `~1` before `~0`, escape `~` before `/`

3. **Array Index Rules**:

```
- Must be non-negative integer or "-"
- No leading zeros (except "0" itself)
- "-" means past-the-end (for append)
```

4. **parse() Implementation**:

```typescript
export function parse(pointer: string): PathSegment[] {
	if (pointer === '') return [];
	if (!pointer.startsWith('/')) {
		throw new JSONPointerError(
			'JSON Pointer must be empty or start with /',
			'POINTER_ERROR',
		);
	}

	return pointer
		.slice(1)
		.split('/')
		.map((token) => {
			const unescaped = unescape(token);
			// Check if valid array index
			if (/^(0|[1-9]\d*)$/.test(unescaped)) {
				return parseInt(unescaped, 10);
			}
			return unescaped;
		});
}
```

5. **set() Implementation** (immutable):

```typescript
export function set<T>(
	pointer: string | PathSegment[],
	data: T,
	value: unknown,
): T {
	const path = typeof pointer === 'string' ? parse(pointer) : pointer;
	if (path.length === 0) return value as T;

	return setRecursive(data, path, 0, value) as T;
}

function setRecursive(
	current: unknown,
	path: PathSegment[],
	index: number,
	value: unknown,
): unknown {
	const key = path[index];
	const isLast = index === path.length - 1;

	if (isArray(current)) {
		const arr = [...current];
		const idx = key === '-' ? arr.length : (key as number);

		if (typeof idx !== 'number' || idx < 0) {
			throw new JSONPointerError(
				`Invalid array index: ${key}`,
				'POINTER_ERROR',
			);
		}

		if (isLast) {
			arr[idx] = value;
		} else {
			arr[idx] = setRecursive(arr[idx], path, index + 1, value);
		}
		return arr;
	}

	if (isObject(current)) {
		const obj = { ...current };
		if (isLast) {
			obj[String(key)] = value;
		} else {
			obj[String(key)] = setRecursive(obj[String(key)], path, index + 1, value);
		}
		return obj;
	}

	// Create structure if needed
	if (typeof path[index + 1] === 'number' || path[index + 1] === '-') {
		const arr: unknown[] = [];
		arr[key as number] = isLast
			? value
			: setRecursive(undefined, path, index + 1, value);
		return arr;
	}

	return {
		[String(key)]: isLast
			? value
			: setRecursive(undefined, path, index + 1, value),
	};
}
```

---

### 4.8 @jsonpath/patch

**Purpose**: RFC 6902 JSON Patch implementation.

**Dependencies**: `@jsonpath/core`, `@jsonpath/pointer`

**Exports**:

```typescript
// Operation types
export interface PatchOperation {
	op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
	path: string;
	value?: unknown;
	from?: string;
}

export type PatchDocument = readonly PatchOperation[];

// Application
export function apply<T>(
	operations: PatchDocument,
	data: T,
	options?: ApplyOptions,
): T;

export interface ApplyOptions {
	/** Mutate original data (default: false) */
	mutate?: boolean;

	/** Validate operations before applying (default: true) */
	validate?: boolean;

	/** Continue on error (default: false) */
	continueOnError?: boolean;

	/** Generate inverse operations for undo (default: false) */
	inverse?: boolean;

	/** Hook called before each operation */
	before?: (data: unknown, op: PatchOperation, index: number) => void;

	/** Hook called after each operation */
	after?: (
		data: unknown,
		op: PatchOperation,
		index: number,
		result: unknown,
	) => void;
}

export interface ApplyResult<T> {
	result: T;
	errors: PatchError[];
}

export interface ApplyResultWithInverse<T> extends ApplyResult<T> {
	/** Operations to undo this patch */
	inverse: PatchOperation[];
}

export function applyWithErrors<T>(
	operations: PatchDocument,
	data: T,
	options?: ApplyOptions,
): ApplyResult<T>;

/** Apply patch and generate inverse operations for undo */
export function applyWithInverse<T>(
	operations: PatchDocument,
	data: T,
	options?: Omit<ApplyOptions, 'inverse'>,
): ApplyResultWithInverse<T>;

// JSONPath-based bulk operations
export interface JSONPathPatchOperation {
	op: 'replace' | 'remove' | 'transform';
	jsonpath: string;
	value?: unknown;
	transform?: (value: unknown, node: QueryNode) => unknown;
}

/** Apply operations using JSONPath selectors (matches multiple nodes) */
export function applyWithJSONPath<T>(
	operations: JSONPathPatchOperation[],
	data: T,
	options?: ApplyOptions,
): T;

/** Convert JSONPath matches to standard patch operations */
export function toPatchOperations(
	data: unknown,
	operations: JSONPathPatchOperation[],
): PatchOperation[];

// Validation
export function validate(operations: PatchDocument): ValidationError[];

export interface ValidationError {
	index: number;
	operation: PatchOperation;
	message: string;
	code: string;
}

// Diff generation
export function diff(
	source: unknown,
	target: unknown,
	options?: DiffOptions,
): PatchOperation[];

export interface DiffOptions {
	/** Generate 'move' operations for relocations */
	detectMoves?: boolean;

	/** Include 'test' operations for safety */
	includeTests?: boolean;

	/** Maximum array diff complexity before falling back to replace */
	maxArrayDiffSize?: number;

	/** Generate invertible operations */
	invertible?: boolean;
}

// Fluent builder
export class PatchBuilder {
	/** Add value at path */
	add(path: string, value: unknown): this;

	/** Remove value at path */
	remove(path: string): this;

	/** Replace value at path */
	replace(path: string, value: unknown): this;

	/** Move value from one path to another */
	move(from: string, to: string): this;

	/** Copy value from one path to another */
	copy(from: string, to: string): this;

	/** Test value equals expected */
	test(path: string, value: unknown): this;

	// === Bulk operations with JSONPath ===

	/** Replace all values matching JSONPath */
	replaceAll(jsonpath: string, value: unknown): this;

	/** Remove all values matching JSONPath */
	removeAll(jsonpath: string): this;

	/** Transform all values matching JSONPath */
	transformAll(jsonpath: string, fn: (value: unknown) => unknown): this;

	// === Conditional operations ===

	/** Start conditional block - operations only apply if condition matches */
	when(condition: string | ((data: unknown) => boolean)): this;

	/** End conditional block */
	endWhen(): this;

	/** Add operation only if path exists */
	ifExists(path: string): this;

	/** Add operation only if path doesn't exist */
	ifNotExists(path: string): this;

	// === Execution ===

	/** Apply to data */
	apply<T>(data: T, options?: ApplyOptions): T;

	/** Apply and return inverse operations */
	applyWithInverse<T>(
		data: T,
		options?: ApplyOptions,
	): ApplyResultWithInverse<T>;

	/** Get operations array */
	toOperations(): PatchOperation[];

	/** Get operations as JSON string */
	toJSON(): string;

	/** Clear all operations */
	clear(): this;

	/** Clone this builder */
	clone(): PatchBuilder;

	/** Get operation count */
	readonly length: number;
}

// Individual operation functions
export function add<T>(data: T, path: string, value: unknown): T;
export function remove<T>(data: T, path: string): T;
export function replace<T>(data: T, path: string, value: unknown): T;
export function move<T>(data: T, from: string, to: string): T;
export function copy<T>(data: T, from: string, to: string): T;
export function test(data: unknown, path: string, value: unknown): boolean;
```

**Operation Semantics** (RFC 6902):

#### `add`

```
{ "op": "add", "path": "/a/b", "value": "foo" }
```

- If path exists: replace existing value
- If path doesn't exist: create it
- For arrays: insert at index, shift subsequent elements
- For "-": append to array

#### `remove`

```
{ "op": "remove", "path": "/a/b" }
```

- Path must exist
- For arrays: remove element, shift subsequent elements

#### `replace`

```
{ "op": "replace", "path": "/a/b", "value": "bar" }
```

- Path must exist
- Semantically equivalent to `remove` then `add`

#### `move`

```
{ "op": "move", "from": "/a/b", "path": "/c/d" }
```

- `from` must exist
- Semantically equivalent to `remove(from)` then `add(path, value)`
- Cannot move to descendant of itself

#### `copy`

```
{ "op": "copy", "from": "/a/b", "path": "/c/d" }
```

- `from` must exist
- Deep copies the value

#### `test`

```
{ "op": "test", "path": "/a/b", "value": "foo" }
```

- Path must exist
- Value must deep-equal specified value
- Failure throws error (aborts patch)

**Diff Algorithm**:

```typescript
export function diff(
	source: unknown,
	target: unknown,
	basePath = '',
): PatchOperation[] {
	// Same reference or equal primitives
	if (source === target) return [];
	if (deepEqual(source, target)) return [];

	// Type mismatch or primitive change
	if (
		source === null ||
		target === null ||
		typeof source !== 'object' ||
		typeof target !== 'object' ||
		Array.isArray(source) !== Array.isArray(target)
	) {
		return [{ op: 'replace', path: basePath || '/', value: target }];
	}

	const ops: PatchOperation[] = [];

	if (Array.isArray(source) && Array.isArray(target)) {
		// Array diff - LCS or simple index-based
		ops.push(...diffArrays(source, target, basePath));
	} else {
		// Object diff
		ops.push(
			...diffObjects(
				source as Record<string, unknown>,
				target as Record<string, unknown>,
				basePath,
			),
		);
	}

	return ops;
}
```

---

### 4.9 @jsonpath/jsonpath

**Purpose**: Main entrypoint and facade over all packages.

**Dependencies**: All other @jsonpath/\* packages (optional peer deps for plugins)

**Exports**:

```typescript
// === Re-exports from all packages ===

// Types
export type {
  JSONValue,
  JSONPrimitive,
  JSONObject,
  JSONArray,
  PathSegment,
  Path,
  QueryNode,
  QueryResult,
  FunctionDefinition,
  SelectorDefinition,
  OperatorDefinition,
  ParameterType,
  ReturnType,
} from '@jsonpath/core';

export type { Token, TokenType } from '@jsonpath/lexer';
export type {
  ASTNode,
  QueryNode as ASTQueryNode,
  NodeType,
  // ... all AST types
} from '@jsonpath/parser';

export type { CompiledQuery, CompilerOptions } from '@jsonpath/compiler';
export type { EvaluatorOptions, EvaluationContext } from '@jsonpath/evaluator';
export type {
  PatchOperation,
  PatchDocument,
  ApplyOptions,
  DiffOptions,
  ValidationError
} from '@jsonpath/patch';

// Errors
export {
  JSONPathError,
  JSONPathSyntaxError,
  JSONPathTypeError,
  JSONPathReferenceError,
  JSONPointerError,
  JSONPatchError,
} from '@jsonpath/core';

// === Configuration ===

export interface JSONPathConfig {
  /** Use compiler for queries (default: false) */
  useCompiler?: boolean;

  /** Query cache size (default: 1000) */
  cacheSize?: number;

  /** Default evaluator options */
  evaluatorOptions?: EvaluatorOptions;

  /** Default compiler options */
  compilerOptions?: CompilerOptions;

  /** Plugins to load */
  plugins?: Plugin[];
}

export interface Plugin {
  /** Unique plugin name */
  readonly name: string;

  /** Setup function called during configure() */
  setup(ctx: PluginContext): void;

  /** Optional cleanup */
  teardown?(): void;
}

export interface PluginContext {
  /** Register a filter function */
  registerFunction(def: FunctionDefinition): void;

  /** Register a custom selector */
  registerSelector(def: SelectorDefinition): void;

  /** Register a custom operator */
  registerOperator(def: OperatorDefinition): void;

  /** Access to configuration */
  readonly config: Readonly<JSONPathConfig>;
}

/** Configure global settings */
export function configure(options: Partial<JSONPathConfig>): void;

/** Get current configuration */
export function getConfig(): Readonly<JSONPathConfig>;

/** Reset to default configuration */
export function reset(): void;

// === JSONPath API ===

/** Execute query and return results */
export function query<T = unknown>(
  path: string,
  data: unknown,
  options?: QueryOptions
): QueryResult<T>;

/** Get first matching node or undefined (optimized single-match) */
export function match<T = unknown>(
  path: string,
  data: unknown,
  options?: QueryOptions
): QueryNode<T> | undefined;

/** Get first matching value or undefined */
export function value<T = unknown>(
  path: string,
  data: unknown,
  options?: QueryOptions
): T | undefined;

/** Check if any nodes match the query */
export function exists(
  path: string,
  data: unknown,
  options?: QueryOptions
): boolean;

/** Count matching nodes (optimized, doesn't collect results) */
export function count(
  path: string,
  data: unknown,
  options?: QueryOptions
): number;

/** Compile query for repeated use */
export function compile<T = unknown>(
  path: string,
  options?: CompilerOptions
): CompiledQuery<T>;

/** Stream results (generator) */
export function* stream<T = unknown>(
  path: string,
  data: unknown,
  options?: QueryOptions
): Generator<QueryNode<T>>;

/** Parse query to AST */
export function parse(path: string): ASTQueryNode;

/** Execute multiple queries in single traversal */
export function multiQuery(
  data: unknown,
  queries: string[] | Record<string, string>,
  options?: QueryOptions
): Map<string, QueryResult> | Record<string, QueryResult>;

/** Create reusable multi-query executor */
export function createQuerySet(
  queries: Array<{ name: string; path: string }> | Record<string, string>
): QuerySet;

export interface QuerySet {
  /** Execute all queries against data */
  execute(data: unknown): Record<string, QueryResult>;

  /** Add a query to the set */
  add(name: string, path: string): this;

  /** Remove a query from the set */
  remove(name: string): boolean;

  /** Get query names */
  readonly names: string[];
}

// === Data Transformation API ===

/** Transform values at matched paths, returning new document */
export function transform<T = unknown>(
  data: T,
  path: string,
  fn: (value: unknown, node: QueryNode) => unknown
): T;

/** Transform with multiple path/transform pairs */
export function transformAll<T = unknown>(
  data: T,
  transforms: Array<{ path: string; fn: (value: unknown, node: QueryNode) => unknown }>
): T;

/** Project/select specific paths into new structure */
export function project<T extends Record<string, string>>(
  data: unknown,
  projection: T
): { [K in keyof T]: unknown };

/** Project with transform functions */
export function projectWith<T extends Record<string, { path: string; transform?: (v: unknown) => unknown }>>(
  data: unknown,
  projection: T
): { [K in keyof T]: unknown };

/** Pick only specified paths from document */
export function pick<T = unknown>(
  data: T,
  paths: string[]
): Partial<T>;

/** Omit specified paths from document */
export function omit<T = unknown>(
  data: T,
  paths: string[]
): Partial<T>;

/** Deep merge multiple documents */
export function merge<T = unknown>(
  target: T,
  ...sources: unknown[]
): T;

export function mergeWith<T = unknown>(
  target: T,
  sources: unknown[],
  options: MergeOptions
): T;

export interface MergeOptions {
  /** How to handle arrays: 'replace' | 'concat' | 'union' */
  arrays?: 'replace' | 'concat' | 'union';
  /** How to handle undefined: 'skip' | 'set' */
  undefined?: 'skip' | 'set';
  /** Custom merge function */
  customizer?: (target: unknown, source: unknown, key: string) => unknown;
}

export interface QueryOptions extends EvaluatorOptions {
  /** Force interpreter mode even if compiler enabled */
  interpret?: boolean;

  /** Callback invoked for each match (enables early termination) */
  onMatch?: (node: QueryNode) => boolean | void;
}

/** Execute query with security restrictions for untrusted input */
export function secureQuery<T = unknown>(
  path: string,
  data: unknown,
  options: SecureQueryOptions
): QueryResult<T>;

/** Validate a query string without executing */
export function validateQuery(path: string): ValidationResult;

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    message: string;
    position?: number;
    code: string;
  }>;
  ast?: ASTQueryNode;
}

// === JSON Pointer API ===

export {
  parse as parsePointer,
  stringify as stringifyPointer,
  resolve,
  resolveOrThrow,
  resolveWithParent,
  exists,
  set,
  remove,
  append,
  isValid as isValidPointer,
  validate as validatePointer,
  parent as pointerParent,
  join as joinPointers,
  escape as escapePointer,
  unescape as unescapePointer,
} from '@jsonpath/pointer';

// === JSON Patch API ===

export {
  apply,
  applyWithErrors,
  applyWithInverse,
  applyWithJSONPath,
  toPatchOperations,
  validate as validatePatch,
  diff,
  PatchBuilder,
  add as patchAdd,
  remove as patchRemove,
  replace as patchReplace,
  move as patchMove,
  copy as patchCopy,
  test as patchTest,
} from '@jsonpath/patch';

// === JSON Merge Patch API ===

export {
  mergePatch,
  createMergePatch,
  isValidMergePatch,
  mergePatchWithTrace,
  toJSONPatch as mergePatchToJSONPatch,
  fromJSONPatch as jsonPatchToMergePatch,
} from '@jsonpath/merge-patch';

// === Conversion Utilities ===

/** Convert path segments to JSON Pointer string */
export function pathToPointer(path: readonly PathSegment[]): string;

/** Convert JSON Pointer string to path segments */
export function pointerToPath(pointer: string): PathSegment[];

/** Convert JSONPath normalized path to JSON Pointer */
export function jsonPathToPointer(normalizedPath: string): string;

// === Cache Management ===

/** Clear query cache */
export function clearCache(): void;

/** Get cache statistics */
export function getCacheStats(): CacheStats;

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}
```

**Internal Implementation**:

```typescript
// Internal state
let config: JSONPathConfig = {
	useCompiler: false,
	cacheSize: 1000,
	evaluatorOptions: {},
	compilerOptions: {},
	plugins: [],
};

const queryCache = new Map<string, ASTQueryNode>();
const compiledCache = new Map<string, CompiledQuery>();
let cacheHits = 0;
let cacheMisses = 0;

export function configure(options: Partial<JSONPathConfig>): void {
	// Merge options
	config = { ...config, ...options };

	// Initialize plugins
	const ctx: PluginContext = {
		registerFunction: (def) => functionRegistry.set(def.name, def),
		registerSelector: (def) => selectorRegistry.set(def.name, def),
		registerOperator: (def) => operatorRegistry.set(def.symbol, def),
		get config() {
			return config;
		},
	};

	for (const plugin of config.plugins ?? []) {
		plugin.setup(ctx);
	}
}

export function query<T = unknown>(
	path: string,
	data: unknown,
	options?: QueryOptions,
): QueryResult<T> {
	// Get or parse AST
	let ast = queryCache.get(path);
	if (!ast) {
		cacheMisses++;
		ast = parse(path);

		// LRU eviction
		if (queryCache.size >= config.cacheSize) {
			const oldest = queryCache.keys().next().value;
			queryCache.delete(oldest);
		}
		queryCache.set(path, ast);
	} else {
		cacheHits++;
	}

	// Execute
	if (config.useCompiler && !options?.interpret) {
		let compiled = compiledCache.get(path);
		if (!compiled) {
			compiled = compile(ast, config.compilerOptions);
			compiledCache.set(path, compiled);
		}
		return compiled(data);
	}

	return evaluate(ast, data, { ...config.evaluatorOptions, ...options });
}
```

---

### 4.10 @jsonpath/merge-patch

**Purpose**: RFC 7386 JSON Merge Patch implementation.

**Dependencies**: `@jsonpath/core`

**Exports**:

```typescript
/**
 * Apply a merge patch to a target document.
 *
 * Per RFC 7386:
 * - null values in patch delete the corresponding key
 * - Arrays are replaced entirely (not merged element-wise)
 * - Objects are recursively merged
 * - Non-object patches replace the target entirely
 */
export function mergePatch<T = unknown>(
	target: T,
	patch: unknown,
	options?: MergePatchOptions,
): T;

export interface MergePatchOptions {
	/** Clone target before patching (default: true for immutability) */
	immutable?: boolean;
}

/**
 * Generate a merge patch that transforms source into target.
 *
 * Note: Merge patches cannot represent all transformations
 * (e.g., setting a value to null vs deleting it)
 */
export function createMergePatch(source: unknown, target: unknown): unknown;

/**
 * Validate that a value is a valid merge patch.
 * Merge patches must be objects (or null to clear entirely).
 */
export function isValidMergePatch(patch: unknown): boolean;

/**
 * Apply merge patch and return both result and operations performed.
 * Useful for debugging and audit trails.
 */
export function mergePatchWithTrace<T = unknown>(
	target: T,
	patch: unknown,
	options?: MergePatchOptions,
): MergePatchResult<T>;

export interface MergePatchResult<T> {
	result: T;
	trace: MergePatchOperation[];
}

export interface MergePatchOperation {
	type: 'set' | 'delete' | 'replace';
	path: string; // JSON Pointer
	oldValue?: unknown;
	newValue?: unknown;
}

/**
 * Convert a merge patch to equivalent JSON Patch operations.
 * Useful for systems that only support RFC 6902.
 */
export function toJSONPatch(
	target: unknown,
	mergePatch: unknown,
): PatchOperation[];

/**
 * Convert JSON Patch operations to a merge patch where possible.
 * Note: Not all JSON Patch operations can be represented as merge patches.
 * Throws if conversion is not possible.
 */
export function fromJSONPatch(operations: PatchOperation[]): unknown;
```

**Implementation Notes**:

Per RFC 7386, the merge patch algorithm:

```typescript
function mergePatch<T>(target: T, patch: unknown): T {
	if (!isObject(patch)) {
		// Non-object patches replace entirely
		return patch as T;
	}

	// Start with clone of target (or empty object)
	const result = isObject(target) ? { ...target } : {};

	for (const [key, value] of Object.entries(patch)) {
		if (value === null) {
			// null means delete
			delete result[key];
		} else {
			// Recursively merge
			result[key] = mergePatch(result[key], value);
		}
	}

	return result as T;
}
```

**Comparison with JSON Patch (RFC 6902)**:

| Feature     | JSON Patch                           | JSON Merge Patch               |
| ----------- | ------------------------------------ | ------------------------------ |
| Set value   | `{ op: "add/replace", path, value }` | `{ key: value }`               |
| Delete      | `{ op: "remove", path }`             | `{ key: null }`                |
| Move/Copy   | Supported                            | Not supported                  |
| Test        | Supported                            | Not supported                  |
| Array merge | Element-wise operations              | Replace entire array           |
| Set to null | `{ op: "replace", value: null }`     | Cannot distinguish from delete |

---

## 5. Plugin Specifications

### 5.1 Plugin Interface

```typescript
export interface Plugin {
	/** Unique identifier */
	readonly name: string;

	/** Human-readable description */
	readonly description?: string;

	/** Semantic version */
	readonly version?: string;

	/** Dependencies on other plugins */
	readonly dependencies?: string[];

	/** Setup function */
	setup(ctx: PluginContext): void | Promise<void>;

	/** Cleanup function */
	teardown?(): void | Promise<void>;
}
```

### 5.2 @jsonpath/plugin-extended

Extended selectors from jsonpath-plus.

```typescript
// Package: @jsonpath/plugin-extended
import type { Plugin } from '@jsonpath/jsonpath';

export const extendedPlugin: Plugin = {
	name: 'extended',
	description: 'Extended selectors: parent (^), property name (~)',
	version: '1.0.0',

	setup(ctx) {
		// Parent selector: ^
		ctx.registerSelector({
			name: 'parent',
			parse(lexer) {
				if (lexer.peek().type === 'CARET') {
					// Requires lexer extension
					lexer.next();
					return { type: 'ParentSelector' };
				}
				return null;
			},
			*evaluate(node, ctx) {
				if (node.path.length > 0) {
					const parentPath = node.path.slice(0, -1);
					yield {
						value: resolve(parentPath, node.root),
						path: parentPath,
						root: node.root,
					};
				}
			},
		});

		// Property name selector: ~
		ctx.registerSelector({
			name: 'propertyName',
			parse(lexer) {
				if (lexer.peek().type === 'TILDE') {
					lexer.next();
					return { type: 'PropertyNameSelector' };
				}
				return null;
			},
			*evaluate(node) {
				if (node.path.length > 0) {
					const key = node.path[node.path.length - 1];
					yield {
						value: key,
						path: node.path,
						root: node.root,
					};
				}
			},
		});
	},
};

export default extendedPlugin;
```

### 5.3 @jsonpath/plugin-types

Type checking and coercion functions.

```typescript
// Package: @jsonpath/plugin-types
import type { Plugin, FunctionDefinition } from '@jsonpath/jsonpath';

const typeFunctions: FunctionDefinition[] = [
	// Type predicates
	{
		name: 'isString',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => typeof v === 'string',
	},
	{
		name: 'isNumber',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => typeof v === 'number' && !Number.isNaN(v),
	},
	{
		name: 'isInteger',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => typeof v === 'number' && Number.isInteger(v),
	},
	{
		name: 'isBoolean',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => typeof v === 'boolean',
	},
	{
		name: 'isNull',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => v === null,
	},
	{
		name: 'isArray',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => Array.isArray(v),
	},
	{
		name: 'isObject',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
	},

	// Type coercion
	{
		name: 'toNumber',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => {
			if (typeof v === 'number') return v;
			if (typeof v === 'string') {
				const n = Number(v);
				return Number.isNaN(n) ? null : n;
			}
			if (typeof v === 'boolean') return v ? 1 : 0;
			return null;
		},
	},
	{
		name: 'toString',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => {
			if (v === null || v === undefined) return null;
			if (typeof v === 'object') return JSON.stringify(v);
			return String(v);
		},
	},
	{
		name: 'toBoolean',
		signature: ['ValueType'],
		returns: 'LogicalType',
		evaluate: (v) => {
			if (typeof v === 'boolean') return v;
			if (typeof v === 'string') return v.length > 0;
			if (typeof v === 'number') return v !== 0;
			if (Array.isArray(v)) return v.length > 0;
			if (v !== null && typeof v === 'object') return Object.keys(v).length > 0;
			return false;
		},
	},
];

export const typesPlugin: Plugin = {
	name: 'types',
	description: 'Type checking and coercion functions',
	version: '1.0.0',

	setup(ctx) {
		for (const fn of typeFunctions) {
			ctx.registerFunction(fn);
		}
	},
};

export default typesPlugin;

// Named exports for selective import
export const isString = typeFunctions[0];
export const isNumber = typeFunctions[1];
// ... etc
```

### 5.4 @jsonpath/plugin-arithmetic

Arithmetic operators in filter expressions.

```typescript
// Package: @jsonpath/plugin-arithmetic
import type { Plugin, OperatorDefinition } from '@jsonpath/jsonpath';

const operators: OperatorDefinition[] = [
	{
		symbol: '+',
		precedence: 50,
		associativity: 'left',
		evaluate: (a, b) => {
			if (typeof a === 'number' && typeof b === 'number') return a + b;
			if (typeof a === 'string' && typeof b === 'string') return a + b;
			return null;
		},
	},
	{
		symbol: '-',
		precedence: 50,
		associativity: 'left',
		evaluate: (a, b) => {
			if (typeof a === 'number' && typeof b === 'number') return a - b;
			return null;
		},
	},
	{
		symbol: '*',
		precedence: 60,
		associativity: 'left',
		evaluate: (a, b) => {
			if (typeof a === 'number' && typeof b === 'number') return a * b;
			return null;
		},
	},
	{
		symbol: '/',
		precedence: 60,
		associativity: 'left',
		evaluate: (a, b) => {
			if (typeof a === 'number' && typeof b === 'number') {
				if (b === 0) return null; // Division by zero
				return a / b;
			}
			return null;
		},
	},
	{
		symbol: '%',
		precedence: 60,
		associativity: 'left',
		evaluate: (a, b) => {
			if (typeof a === 'number' && typeof b === 'number') {
				if (b === 0) return null;
				return a % b;
			}
			return null;
		},
	},
];

export const arithmeticPlugin: Plugin = {
	name: 'arithmetic',
	description: 'Arithmetic operators: + - * / %',
	version: '1.0.0',

	setup(ctx) {
		for (const op of operators) {
			ctx.registerOperator(op);
		}
	},
};

export default arithmeticPlugin;
```

### 5.5 @jsonpath/plugin-extras

Additional utility functions.

```typescript
// Package: @jsonpath/plugin-extras
import type { Plugin, FunctionDefinition } from '@jsonpath/jsonpath';

const functions: FunctionDefinition[] = [
	// String functions
	{
		name: 'startsWith',
		signature: ['ValueType', 'ValueType'],
		returns: 'LogicalType',
		evaluate: (str, prefix) =>
			typeof str === 'string' &&
			typeof prefix === 'string' &&
			str.startsWith(prefix),
	},
	{
		name: 'endsWith',
		signature: ['ValueType', 'ValueType'],
		returns: 'LogicalType',
		evaluate: (str, suffix) =>
			typeof str === 'string' &&
			typeof suffix === 'string' &&
			str.endsWith(suffix),
	},
	{
		name: 'contains',
		signature: ['ValueType', 'ValueType'],
		returns: 'LogicalType',
		evaluate: (container, item) => {
			if (typeof container === 'string' && typeof item === 'string') {
				return container.includes(item);
			}
			if (Array.isArray(container)) {
				return container.some((x) => deepEqual(x, item));
			}
			return false;
		},
	},
	{
		name: 'lower',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (typeof v === 'string' ? v.toLowerCase() : null),
	},
	{
		name: 'upper',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (typeof v === 'string' ? v.toUpperCase() : null),
	},
	{
		name: 'trim',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (typeof v === 'string' ? v.trim() : null),
	},
	{
		name: 'substring',
		signature: ['ValueType', 'ValueType', 'ValueType'],
		returns: 'ValueType',
		evaluate: (str, start, end) => {
			if (typeof str !== 'string') return null;
			if (typeof start !== 'number') return null;
			if (end !== undefined && typeof end !== 'number') return null;
			return str.substring(start, end);
		},
	},
	{
		name: 'split',
		signature: ['ValueType', 'ValueType'],
		returns: 'ValueType',
		evaluate: (str, sep) => {
			if (typeof str !== 'string' || typeof sep !== 'string') return null;
			return str.split(sep);
		},
	},

	// Array/Object functions
	{
		name: 'keys',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => {
			if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
				return Object.keys(v);
			}
			return null;
		},
	},
	{
		name: 'values',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => {
			if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
				return Object.values(v);
			}
			return null;
		},
	},
	{
		name: 'entries',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => {
			if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
				return Object.entries(v);
			}
			return null;
		},
	},
	{
		name: 'first',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) =>
			Array.isArray(nodes) && nodes.length > 0 ? nodes[0] : null,
	},
	{
		name: 'last',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) =>
			Array.isArray(nodes) && nodes.length > 0 ? nodes[nodes.length - 1] : null,
	},
	{
		name: 'reverse',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (Array.isArray(v) ? [...v].reverse() : null),
	},
	{
		name: 'sort',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) => {
			if (!Array.isArray(nodes)) return null;
			return [...nodes].sort((a, b) => {
				if (typeof a === 'number' && typeof b === 'number') return a - b;
				if (typeof a === 'string' && typeof b === 'string')
					return a.localeCompare(b);
				return 0;
			});
		},
	},
	{
		name: 'unique',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) => {
			if (!Array.isArray(nodes)) return null;
			const seen = new Set();
			return nodes.filter((x) => {
				const key = JSON.stringify(x);
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
		},
	},
	{
		name: 'flatten',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (Array.isArray(v) ? v.flat() : null),
	},

	// Aggregation functions
	{
		name: 'min',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) => {
			if (!Array.isArray(nodes) || nodes.length === 0) return null;
			const nums = nodes.filter((n): n is number => typeof n === 'number');
			return nums.length > 0 ? Math.min(...nums) : null;
		},
	},
	{
		name: 'max',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) => {
			if (!Array.isArray(nodes) || nodes.length === 0) return null;
			const nums = nodes.filter((n): n is number => typeof n === 'number');
			return nums.length > 0 ? Math.max(...nums) : null;
		},
	},
	{
		name: 'sum',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) => {
			if (!Array.isArray(nodes)) return null;
			return nodes
				.filter((n): n is number => typeof n === 'number')
				.reduce((a, b) => a + b, 0);
		},
	},
	{
		name: 'avg',
		signature: ['NodesType'],
		returns: 'ValueType',
		evaluate: (nodes) => {
			if (!Array.isArray(nodes) || nodes.length === 0) return null;
			const nums = nodes.filter((n): n is number => typeof n === 'number');
			if (nums.length === 0) return null;
			return nums.reduce((a, b) => a + b, 0) / nums.length;
		},
	},

	// Utility functions
	{
		name: 'floor',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (typeof v === 'number' ? Math.floor(v) : null),
	},
	{
		name: 'ceil',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (typeof v === 'number' ? Math.ceil(v) : null),
	},
	{
		name: 'round',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (typeof v === 'number' ? Math.round(v) : null),
	},
	{
		name: 'abs',
		signature: ['ValueType'],
		returns: 'ValueType',
		evaluate: (v) => (typeof v === 'number' ? Math.abs(v) : null),
	},
];

export const extrasPlugin: Plugin = {
	name: 'extras',
	description: 'Extended utility functions',
	version: '1.0.0',

	setup(ctx) {
		for (const fn of functions) {
			ctx.registerFunction(fn);
		}
	},
};

export default extrasPlugin;
```

### 5.6 @jsonpath/plugin-path-builder

Fluent, type-safe API for constructing JSONPath queries programmatically.

```typescript
// Package: @jsonpath/plugin-path-builder
import type { Plugin } from '@jsonpath/jsonpath';

export class PathBuilder {
	private segments: string[] = [];

	/** Start from root ($) */
	static root(): PathBuilder {
		return new PathBuilder().root();
	}

	/** Add root identifier */
	root(): this {
		this.segments = ['$'];
		return this;
	}

	/** Add child member selector */
	child(name: string): this {
		// Quote if necessary
		if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
			this.segments.push(`.${name}`);
		} else {
			this.segments.push(`['${name.replace(/'/g, "\\'")}']`);
		}
		return this;
	}

	/** Add index selector */
	index(i: number): this {
		this.segments.push(`[${i}]`);
		return this;
	}

	/** Add slice selector */
	slice(start?: number, end?: number, step?: number): this {
		const parts = [start ?? '', end ?? '', step !== undefined ? step : ''];
		// Remove trailing empty parts
		while (parts.length > 1 && parts[parts.length - 1] === '') {
			parts.pop();
		}
		this.segments.push(`[${parts.join(':')}]`);
		return this;
	}

	/** Add wildcard selector */
	wildcard(): this {
		this.segments.push('[*]');
		return this;
	}

	/** Add recursive descent */
	descendant(name?: string): this {
		if (name) {
			this.segments.push(`..${name}`);
		} else {
			this.segments.push('..');
		}
		return this;
	}

	/** Add filter expression */
	filter(expr: string | ((f: FilterBuilder) => FilterBuilder)): this {
		if (typeof expr === 'string') {
			this.segments.push(`[?${expr}]`);
		} else {
			const builder = new FilterBuilder();
			this.segments.push(`[?${expr(builder).build()}]`);
		}
		return this;
	}

	/** Add union of selectors */
	union(...selectors: (string | number)[]): this {
		const formatted = selectors
			.map((s) => (typeof s === 'number' ? s : `'${s}'`))
			.join(', ');
		this.segments.push(`[${formatted}]`);
		return this;
	}

	/** Build the JSONPath string */
	build(): string {
		return this.segments.join('');
	}

	/** Get string representation */
	toString(): string {
		return this.build();
	}
}

export class FilterBuilder {
	private expr: string = '';

	/** Reference current node (@) */
	current(): this {
		this.expr += '@';
		return this;
	}

	/** Reference root ($) */
	root(): this {
		this.expr += '$';
		return this;
	}

	/** Add field access */
	field(name: string): this {
		this.expr += `.${name}`;
		return this;
	}

	/** Add comparison: equals */
	eq(value: unknown): this {
		this.expr += ` == ${JSON.stringify(value)}`;
		return this;
	}

	/** Add comparison: not equals */
	ne(value: unknown): this {
		this.expr += ` != ${JSON.stringify(value)}`;
		return this;
	}

	/** Add comparison: less than */
	lt(value: number): this {
		this.expr += ` < ${value}`;
		return this;
	}

	/** Add comparison: less than or equal */
	lte(value: number): this {
		this.expr += ` <= ${value}`;
		return this;
	}

	/** Add comparison: greater than */
	gt(value: number): this {
		this.expr += ` > ${value}`;
		return this;
	}

	/** Add comparison: greater than or equal */
	gte(value: number): this {
		this.expr += ` >= ${value}`;
		return this;
	}

	/** Add logical AND */
	and(other: string | ((f: FilterBuilder) => FilterBuilder)): this {
		if (typeof other === 'string') {
			this.expr += ` && ${other}`;
		} else {
			const builder = new FilterBuilder();
			this.expr += ` && ${other(builder).build()}`;
		}
		return this;
	}

	/** Add logical OR */
	or(other: string | ((f: FilterBuilder) => FilterBuilder)): this {
		if (typeof other === 'string') {
			this.expr += ` || ${other}`;
		} else {
			const builder = new FilterBuilder();
			this.expr += ` || ${other(builder).build()}`;
		}
		return this;
	}

	/** Add function call */
	fn(name: string, ...args: unknown[]): this {
		this.expr += `${name}(${args
			.map((a) =>
				typeof a === 'string' && a.startsWith('@') ? a : JSON.stringify(a),
			)
			.join(', ')})`;
		return this;
	}

	/** Wrap in parentheses */
	group(): this {
		this.expr = `(${this.expr})`;
		return this;
	}

	/** Build the filter expression */
	build(): string {
		return this.expr;
	}
}

// Factory function
export function pathBuilder(): PathBuilder {
	return PathBuilder.root();
}

// Export as plugin for registration
export const pathBuilderPlugin: Plugin = {
	name: 'path-builder',
	description: 'Fluent API for building JSONPath queries',
	version: '1.0.0',

	setup(ctx) {
		// This plugin doesn't register functions/selectors,
		// it just provides the PathBuilder class
	},
};

export default pathBuilderPlugin;
```

**Usage Examples**:

```typescript
import { PathBuilder, pathBuilder } from '@jsonpath/plugin-path-builder';

// Simple path
const path1 = pathBuilder()
	.child('store')
	.child('books')
	.wildcard()
	.child('title')
	.build();
// '$.store.books[*].title'

// With filter
const path2 = pathBuilder()
	.child('users')
	.filter((f) => f.current().field('age').gte(18))
	.child('name')
	.build();
// '$.users[?@.age >= 18].name'

// Complex filter
const path3 = pathBuilder()
	.child('products')
	.filter((f) =>
		f
			.current()
			.field('price')
			.lt(100)
			.and((fb) => fb.current().field('inStock').eq(true)),
	)
	.build();
// '$.products[?@.price < 100 && @.inStock == true]'

// Recursive descent with slice
const path4 = pathBuilder().descendant('items').slice(0, 10).build();
// '$..items[0:10]'
```

---

## 6. RFC Compliance

### 6.1 RFC 9535 (JSONPath) Compliance Matrix

| Section | Feature              | Status      | Notes                               |
| ------- | -------------------- | ----------- | ----------------------------------- |
| 2.1     | Root identifier `$`  | ✅ Required |                                     |
| 2.2     | Current node `@`     | ✅ Required | In filter expressions               |
| 2.3.1   | Name selector        | ✅ Required |                                     |
| 2.3.2   | Index selector       | ✅ Required | Negative indices                    |
| 2.3.3   | Wildcard selector    | ✅ Required |                                     |
| 2.3.4   | Slice selector       | ✅ Required | start:end:step                      |
| 2.3.5   | Filter selector      | ✅ Required |                                     |
| 2.4     | Descendant segment   | ✅ Required | `..`                                |
| 2.5     | Normalized paths     | ✅ Required |                                     |
| 3.1     | Comparison operators | ✅ Required | == != < <= > >=                     |
| 3.2     | Logical operators    | ✅ Required | && \|\| !                           |
| 3.3     | Parentheses          | ✅ Required |                                     |
| 3.4     | Function extensions  | ✅ Required | length, count, match, search, value |
| 3.5     | Type system          | ✅ Required | ValueType, LogicalType, NodesType   |

### 6.2 RFC 6901 (JSON Pointer) Compliance Matrix

| Section | Feature                    | Status      | Notes            |
| ------- | -------------------------- | ----------- | ---------------- |
| 3       | Syntax                     | ✅ Required | `""` or `"/..."` |
| 4       | Evaluation                 | ✅ Required |                  |
| 5       | JSON string representation | ✅ Required |                  |
| 6       | URI fragment identifier    | 🔶 Optional | URL encoding     |

### 6.3 RFC 6902 (JSON Patch) Compliance Matrix

| Section | Feature        | Status      | Notes             |
| ------- | -------------- | ----------- | ----------------- |
| 4.1     | add            | ✅ Required |                   |
| 4.2     | remove         | ✅ Required |                   |
| 4.3     | replace        | ✅ Required |                   |
| 4.4     | move           | ✅ Required |                   |
| 4.5     | copy           | ✅ Required |                   |
| 4.6     | test           | ✅ Required |                   |
| 5       | Error handling | ✅ Required | Atomic operations |

### 6.4 RFC 7386 (JSON Merge Patch) Compliance Matrix

| Feature                | Status      | Notes                    |
| ---------------------- | ----------- | ------------------------ |
| Object merge           | ✅ Required | Recursive merge          |
| Null deletion          | ✅ Required | `null` removes key       |
| Array replacement      | ✅ Required | Arrays replaced entirely |
| Non-object patches     | ✅ Required | Replace target           |
| Merge patch generation | ✅ Required | Diff to merge patch      |

### 6.5 Compliance Test Suites

The implementation MUST pass:

1. **JSONPath Compliance Test Suite**: https://github.com/jsonpath-standard/jsonpath-compliance-test-suite
2. **JSON Pointer Test Suite**: Custom suite based on RFC 6901 examples
3. **JSON Patch Test Suite**: https://github.com/json-patch/json-patch-tests
4. **JSON Merge Patch Tests**: Custom suite based on RFC 7386 examples

---

## 7. Type System

### 7.1 RFC 9535 Type System

```typescript
/**
 * RFC 9535 defines three logical types for filter expressions:
 *
 * ValueType: JSON values or Nothing
 * - Includes: string, number, boolean, null, array, object
 * - Special: Nothing (absence of value, distinct from null)
 *
 * LogicalType: Boolean result
 * - true or false
 * - Result of comparisons and logical operations
 *
 * NodesType: Collection of nodes
 * - Result of filter query evaluations (@.foo, $.bar)
 * - Used with count() and value() functions
 */

// Internal representation
export type ValueType = JSONValue | Nothing;
export type LogicalType = boolean;
export type NodesType = QueryNode[];

// Nothing represents absence of value (distinct from null)
export const Nothing = Symbol('Nothing');
export type Nothing = typeof Nothing;

// Type guards
export function isNothing(value: unknown): value is Nothing {
	return value === Nothing;
}

export function isValueType(value: unknown): value is ValueType {
	return (
		value === Nothing ||
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean' ||
		Array.isArray(value) ||
		(typeof value === 'object' && value !== null)
	);
}
```

### 7.2 TypeScript Generic Types

```typescript
// Query result with type parameter
export interface QueryResult<T = unknown> {
	values(): T[];
	first(): QueryNode<T> | undefined;
	// ...
}

// Compiled query with type parameter
export interface CompiledQuery<T = unknown> {
	(data: unknown): QueryResult<T>;
}

// Type-safe usage
interface Book {
	title: string;
	author: string;
	price: number;
}

const getBooks = compile<Book>('$.store.book[*]');
const books: Book[] = getBooks(data).values();

const getTitles = compile<string>('$.store.book[*].title');
const titles: string[] = getTitles(data).values();
```

### 7.3 Function Type Signatures

```typescript
// Function parameter and return type declarations
export interface FunctionDefinition<
	TArgs extends unknown[] = unknown[],
	TReturn = unknown,
> {
	name: string;

	// Signature declares expected types
	signature: readonly ParameterType[];

	// Return type declaration
	returns: ReturnType;

	// Actual implementation (runtime validation)
	evaluate: (...args: TArgs) => TReturn;
}

// Type validation at parse time
function validateFunctionCall(
	call: FunctionCallNode,
	argTypes: ParameterType[],
): TypeError[] {
	const def = functionRegistry.get(call.name);
	if (!def) {
		return [{ message: `Unknown function: ${call.name}` }];
	}

	const errors: TypeError[] = [];

	// Check arity
	if (argTypes.length !== def.signature.length) {
		errors.push({
			message: `Function ${call.name} expects ${def.signature.length} arguments, got ${argTypes.length}`,
		});
	}

	// Check types
	for (let i = 0; i < Math.min(argTypes.length, def.signature.length); i++) {
		if (!isTypeCompatible(argTypes[i], def.signature[i])) {
			errors.push({
				message: `Argument ${i + 1} of ${call.name}: expected ${def.signature[i]}, got ${argTypes[i]}`,
			});
		}
	}

	return errors;
}
```

---

## 8. Error Handling

### 8.1 Error Hierarchy

```typescript
// Base error class
export class JSONPathError extends Error {
	constructor(
		message: string,
		public readonly code: ErrorCode,
		options?: {
			position?: number;
			path?: string;
			cause?: Error;
		},
	) {
		super(message);
		this.name = 'JSONPathError';
		this.position = options?.position;
		this.path = options?.path;
		this.cause = options?.cause;
	}

	readonly position?: number;
	readonly path?: string;
	readonly cause?: Error;

	toJSON() {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			position: this.position,
			path: this.path,
		};
	}
}

// Syntax errors during parsing
export class JSONPathSyntaxError extends JSONPathError {
	constructor(
		message: string,
		position: number,
		path: string,
		public readonly expected?: string[],
		public readonly found?: string,
	) {
		super(message, 'SYNTAX_ERROR', { position, path });
		this.name = 'JSONPathSyntaxError';
	}
}

// Type errors in expressions
export class JSONPathTypeError extends JSONPathError {
	constructor(
		message: string,
		public readonly expectedType?: string,
		public readonly actualType?: string,
	) {
		super(message, 'TYPE_ERROR');
		this.name = 'JSONPathTypeError';
	}
}

// Reference errors during evaluation
export class JSONPathReferenceError extends JSONPathError {
	constructor(message: string, path?: string) {
		super(message, 'REFERENCE_ERROR', { path });
		this.name = 'JSONPathReferenceError';
	}
}

// JSON Pointer errors
export class JSONPointerError extends JSONPathError {
	constructor(message: string, pointer?: string) {
		super(message, 'POINTER_ERROR', { path: pointer });
		this.name = 'JSONPointerError';
	}
}

// JSON Patch errors
export class JSONPatchError extends JSONPathError {
	constructor(
		message: string,
		public readonly operationIndex?: number,
		public readonly operation?: PatchOperation,
	) {
		super(message, 'PATCH_ERROR');
		this.name = 'JSONPatchError';
	}
}
```

### 8.2 Error Codes

```typescript
export type ErrorCode =
	// Parsing
	| 'SYNTAX_ERROR' // Invalid syntax
	| 'UNEXPECTED_TOKEN' // Unexpected token
	| 'UNEXPECTED_END' // Unexpected end of input
	| 'INVALID_ESCAPE' // Invalid escape sequence
	| 'INVALID_NUMBER' // Invalid number format

	// Type checking
	| 'TYPE_ERROR' // Type mismatch
	| 'INVALID_ARGUMENT' // Invalid function argument
	| 'UNKNOWN_FUNCTION' // Unknown function name

	// Evaluation
	| 'REFERENCE_ERROR' // Path doesn't exist
	| 'MAX_DEPTH_EXCEEDED' // Recursion limit
	| 'TIMEOUT' // Evaluation timeout

	// Pointer
	| 'POINTER_ERROR' // Invalid pointer
	| 'INVALID_ARRAY_INDEX' // Invalid array index

	// Patch
	| 'PATCH_ERROR' // Patch operation failed
	| 'TEST_FAILED' // Test operation failed
	| 'PATH_NOT_FOUND'; // Path for operation not found
```

### 8.3 Error Messages

Error messages MUST:

1. Be human-readable and actionable
2. Include position information where applicable
3. Suggest fixes where possible

```typescript
// Good error messages
throw new JSONPathSyntaxError(
	'Unexpected token ")" at position 15. Did you mean to close a filter expression?',
	15,
	'$.items[?(@.price > ]',
	['expression', 'number', 'string'],
	')',
);

throw new JSONPathTypeError(
	'Function length() expects a string, array, or object, but received number',
	'string | array | object',
	'number',
);

throw new JSONPatchError(
	'Cannot remove non-existent path "/users/5". The array only has 3 elements.',
	2,
	{ op: 'remove', path: '/users/5' },
);
```

---

## 9. Performance Requirements

### 9.1 Benchmark Targets

| Operation              | Target        | Measurement                         |
| ---------------------- | ------------- | ----------------------------------- |
| Parse simple path      | <1μs          | `$.store.book`                      |
| Parse complex path     | <10μs         | `$.store.book[?@.price < 10].title` |
| Compile simple path    | <50μs         | One-time cost                       |
| Evaluate (interpreted) | >1M ops/sec   | Per query execution                 |
| Evaluate (compiled)    | >5M ops/sec   | Per query execution                 |
| JSON Pointer resolve   | >10M ops/sec  | Simple path lookup                  |
| JSON Patch apply       | >500K ops/sec | Single operation                    |

### 9.2 Memory Requirements

| Resource            | Limit                | Notes                   |
| ------------------- | -------------------- | ----------------------- |
| Query cache         | 1000 entries default | LRU eviction            |
| Compiled cache      | 500 entries default  | Separate from AST cache |
| Max recursion depth | 100 levels           | Configurable            |
| Max result size     | 10,000 nodes default | Configurable            |

### 9.3 Optimization Strategies

#### Lexer Optimizations

```typescript
// 1. ASCII lookup table
const CHAR_FLAGS = new Uint8Array(128);

// 2. Character code constants (avoid string comparisons)
const CH_DOLLAR = 36;
const CH_AT = 64;
// ...

// 3. Inline hot paths
next(): Token {
  this.skipWhitespace();
  if (this.pos >= this.len) return EOF_TOKEN;

  const ch = this.input.charCodeAt(this.pos);

  // Fast path for common single-char tokens
  if (ch < 128) {
    const handler = CHAR_HANDLERS[ch];
    if (handler) return handler.call(this);
  }

  // ... rest of lexer
}
```

#### Parser Optimizations

```typescript
// 1. Minimal allocation during parsing
class Parser {
	// Reuse node objects where safe
	private nodePool: ASTNode[] = [];

	// Avoid creating arrays for single items
	private parseSelectors(): SelectorNode | SelectorNode[] {
		const first = this.parseSelector();
		if (!this.match(TokenType.COMMA)) return first;

		const selectors = [first];
		while (this.match(TokenType.COMMA)) {
			selectors.push(this.parseSelector());
		}
		return selectors;
	}
}

// 2. Inline Pratt precedence checks
const PRECEDENCE = [
	/* OR */ 10, /* AND */ 20, /* EQ */ 30, /* NE */ 30, /* LT */ 40, /* LE */ 40,
	/* GT */ 40, /* GE */ 40,
];
```

#### Evaluator Optimizations

```typescript
// 1. Avoid spreading in hot loops
for (let i = 0; i < items.length; i++) {
	results.push({
		value: items[i],
		path: appendPath(node.path, i), // Reusable function
		root: node.root,
	});
}

// 2. Early exit for empty results
if (nodes.length === 0) return [];

// 3. Type guards with typeof (fastest)
if (typeof value === 'object' && value !== null) {
	if (Array.isArray(value)) {
		// array path
	} else {
		// object path
	}
}
```

#### Compiler Optimizations

```typescript
// 1. Generate specialized code for common patterns
// Simple name selector: $.foo
'const v = data?.["foo"]; return v !== undefined ? [{ value: v, path: ["foo"], root: data }] : [];';

// 2. Inline filter expressions
// [?@.price > 10]
'if (typeof current?.["price"] === "number" && current["price"] > 10)';

// 3. Hoist invariant computations
'const _key = "price";';
'const _threshold = 10;';
```

### 9.4 Benchmark Suite

```typescript
// benchmarks/index.ts
import { bench, group, run } from 'mitata';

const data = require('./fixtures/large-store.json');
const queries = [
	'$.store.book[*].author',
	'$.store.book[?@.price < 10]',
	'$..author',
	'$.store.book[0:3]',
	'$.store.book[?@.isbn].title',
];

group('parse', () => {
	for (const q of queries) {
		bench(q, () => parse(q));
	}
});

group('evaluate (interpreted)', () => {
	for (const q of queries) {
		const ast = parse(q);
		bench(q, () => evaluate(ast, data));
	}
});

group('evaluate (compiled)', () => {
	for (const q of queries) {
		const compiled = compile(q);
		bench(q, () => compiled(data));
	}
});

group('pointer', () => {
	bench('resolve shallow', () => resolve('/store/book/0/title', data));
	bench('resolve deep', () => resolve('/store/book/5/author', data));
	bench('set', () => set('/store/book/0/price', data, 9.99));
});

group('patch', () => {
	const ops = [
		{ op: 'replace', path: '/store/book/0/price', value: 9.99 },
		{ op: 'add', path: '/store/book/-', value: { title: 'New Book' } },
	];
	bench('apply', () => apply(ops, data));
});

run();
```

---

## 10. Testing Requirements

### 10.1 Test Categories

#### Unit Tests

Each package MUST have >90% code coverage.

```typescript
// Example: @jsonpath/lexer tests
describe('Lexer', () => {
	describe('tokenize', () => {
		test('root identifier', () => {
			expect(tokenize('$')).toEqual([
				{ type: TokenType.ROOT, value: '$', start: 0, end: 1 },
				{ type: TokenType.EOF, value: null, start: 1, end: 1 },
			]);
		});

		test('string escapes', () => {
			expect(tokenize("'hello\\nworld'")).toMatchObject([
				{ type: TokenType.STRING, value: 'hello\nworld' },
			]);
		});

		test('numbers', () => {
			const cases = [
				['0', 0],
				['42', 42],
				['-17', -17],
				['3.14', 3.14],
				['1e10', 1e10],
				['-2.5E-3', -2.5e-3],
			];
			for (const [input, expected] of cases) {
				expect(tokenize(input)).toMatchObject([
					{ type: TokenType.NUMBER, value: expected },
				]);
			}
		});
	});
});
```

#### Integration Tests

Test complete query → result flows.

```typescript
describe('query integration', () => {
	const bookstore = {
		store: {
			book: [
				{ title: 'A', author: 'X', price: 5 },
				{ title: 'B', author: 'Y', price: 15 },
				{ title: 'C', author: 'X', price: 25 },
			],
		},
	};

	test('basic path', () => {
		expect(query('$.store.book[0].title', bookstore).values()).toEqual(['A']);
	});

	test('wildcard', () => {
		expect(query('$.store.book[*].author', bookstore).values()).toEqual([
			'X',
			'Y',
			'X',
		]);
	});

	test('filter', () => {
		expect(
			query('$.store.book[?@.price < 20].title', bookstore).values(),
		).toEqual(['A', 'B']);
	});

	test('descendant', () => {
		expect(query('$..author', bookstore).values()).toEqual(['X', 'Y', 'X']);
	});
});
```

#### Compliance Tests

Run against official test suites.

```typescript
// Load JSONPath compliance tests
const complianceTests = require('jsonpath-compliance-test-suite');

describe('RFC 9535 Compliance', () => {
	for (const test of complianceTests) {
		it(test.name, () => {
			if (test.invalid_selector) {
				expect(() => query(test.selector, test.document)).toThrow();
			} else {
				const result = query(test.selector, test.document).values();
				expect(result).toEqual(test.result);
			}
		});
	}
});
```

#### Property-Based Tests

Use fast-check for generative testing.

```typescript
import fc from 'fast-check';

describe('properties', () => {
	test('parse → stringify roundtrip', () => {
		fc.assert(
			fc.property(fc.jsonPath(), (path) => {
				const ast = parse(path);
				const reparsed = parse(stringify(ast));
				expect(reparsed).toEqual(ast);
			}),
		);
	});

	test('pointer parse → stringify roundtrip', () => {
		fc.assert(
			fc.property(fc.jsonPointer(), (ptr) => {
				const segments = parsePointer(ptr);
				const str = stringifyPointer(segments);
				expect(parsePointer(str)).toEqual(segments);
			}),
		);
	});

	test('patch apply then diff recovers operations', () => {
		fc.assert(
			fc.property(fc.json(), fc.patchOperations(), (data, ops) => {
				try {
					const patched = apply(ops, data);
					const recovered = diff(data, patched);
					const repatched = apply(recovered, data);
					expect(repatched).toEqual(patched);
				} catch {
					// Some operations may fail - that's okay
				}
			}),
		);
	});
});
```

#### Performance Tests

Ensure no regressions.

```typescript
describe('performance', () => {
	const largeData = generateLargeDataset(10000);

	test('parse should be <1ms for simple paths', () => {
		const start = performance.now();
		for (let i = 0; i < 1000; i++) {
			parse('$.store.book[*].author');
		}
		const elapsed = performance.now() - start;
		expect(elapsed / 1000).toBeLessThan(1); // <1ms per parse
	});

	test('compiled query should handle large datasets', () => {
		const compiled = compile('$..id');

		const start = performance.now();
		const result = compiled(largeData);
		const elapsed = performance.now() - start;

		expect(elapsed).toBeLessThan(100); // <100ms
		expect(result.length).toBeGreaterThan(0);
	});
});
```

### 10.2 Test Fixtures

```
tests/
├── fixtures/
│   ├── bookstore.json         # Standard test data
│   ├── large-store.json       # Performance test data
│   ├── nested-deep.json       # Deep nesting tests
│   ├── edge-cases.json        # Edge cases
│   └── compliance/            # RFC compliance fixtures
├── unit/
│   ├── core/
│   ├── lexer/
│   ├── parser/
│   └── ...
├── integration/
│   ├── query.test.ts
│   ├── pointer.test.ts
│   └── patch.test.ts
├── compliance/
│   ├── rfc9535.test.ts
│   ├── rfc6901.test.ts
│   └── rfc6902.test.ts
└── performance/
    └── benchmarks.test.ts
```

---

## 11. Build Configuration

### 11.1 Monorepo Structure

```
@jsonpath/
├── package.json              # Root package.json (workspaces)
├── pnpm-workspace.yaml       # pnpm workspace config
├── tsconfig.base.json        # Shared TypeScript config
├── vitest.config.ts          # Shared test config
├── .changeset/               # Changesets for versioning
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── tsup.config.ts
    │   └── src/
    ├── lexer/
    ├── parser/
    └── ...
```

### 11.2 Root package.json

```json
{
	"name": "@jsonpath/monorepo",
	"private": true,
	"type": "module",
	"packageManager": "pnpm@9.0.0",
	"engines": {
		"node": ">=18.0.0"
	},
	"workspaces": ["packages/*"],
	"scripts": {
		"build": "turbo run build",
		"test": "vitest run",
		"test:watch": "vitest",
		"test:coverage": "vitest run --coverage",
		"lint": "eslint packages/*/src",
		"typecheck": "turbo run typecheck",
		"bench": "vitest bench",
		"clean": "turbo run clean",
		"changeset": "changeset",
		"version": "changeset version",
		"release": "turbo run build && changeset publish"
	},
	"devDependencies": {
		"@changesets/cli": "^2.27.0",
		"@types/node": "^20.0.0",
		"eslint": "^8.57.0",
		"tsup": "^8.0.0",
		"turbo": "^2.0.0",
		"typescript": "^5.4.0",
		"vitest": "^1.4.0"
	}
}
```

### 11.3 Package package.json Template

```json
{
	"name": "@jsonpath/core",
	"version": "1.0.0",
	"description": "Core types and utilities for @jsonpath/*",
	"type": "module",
	"main": "./dist/index.cjs",
	"module": "./dist/index.js",
	"types": "./dist/index.d.ts",
	"exports": {
		".": {
			"import": {
				"types": "./dist/index.d.ts",
				"default": "./dist/index.js"
			},
			"require": {
				"types": "./dist/index.d.cts",
				"default": "./dist/index.cjs"
			}
		}
	},
	"files": ["dist"],
	"sideEffects": false,
	"scripts": {
		"build": "tsup",
		"typecheck": "tsc --noEmit",
		"clean": "rm -rf dist"
	},
	"keywords": ["jsonpath", "json", "query"],
	"author": "",
	"license": "MIT",
	"repository": {
		"type": "git",
		"url": "https://github.com/...",
		"directory": "packages/core"
	},
	"publishConfig": {
		"access": "public"
	}
}
```

### 11.4 tsconfig.base.json

```json
{
	"compilerOptions": {
		"target": "ES2020",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"lib": ["ES2020"],
		"strict": true,
		"declaration": true,
		"declarationMap": true,
		"sourceMap": true,
		"esModuleInterop": true,
		"skipLibCheck": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"isolatedModules": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"noImplicitReturns": true,
		"noFallthroughCasesInSwitch": true,
		"exactOptionalPropertyTypes": true,
		"noUncheckedIndexedAccess": true,
		"noPropertyAccessFromIndexSignature": true
	}
}
```

### 11.5 Package tsconfig.json

```json
{
	"extends": "../../tsconfig.base.json",
	"compilerOptions": {
		"outDir": "./dist",
		"rootDir": "./src"
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules", "dist"]
}
```

### 11.6 tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: true,
	clean: true,
	sourcemap: true,
	minify: false,
	treeshake: true,
	splitting: false,
	target: 'es2020',
});
```

### 11.7 Turbo Configuration

```json
{
	"$schema": "https://turbo.build/schema.json",
	"tasks": {
		"build": {
			"dependsOn": ["^build"],
			"outputs": ["dist/**"]
		},
		"typecheck": {
			"dependsOn": ["^build"]
		},
		"test": {
			"dependsOn": ["build"]
		},
		"clean": {
			"cache": false
		}
	}
}
```

---

## 12. Migration Guide

### 12.1 Migrating from json-p3

#### Import Changes

```typescript
// Before (json-p3)
import { JSONPathEnvironment, JSONPointer, JSONPatch } from 'json-p3';

// After (@jsonpath/*)
import {
	query,
	compile,
	resolve,
	apply,
	PatchBuilder,
} from '@jsonpath/jsonpath';
```

#### API Mappings

| json-p3                                 | @jsonpath/\*                 |
| --------------------------------------- | ---------------------------- |
| `env.query(path, data)`                 | `query(path, data)`          |
| `env.query(path, data).values()`        | `query(path, data).values()` |
| `JSONPathEnvironment({ strict: true })` | `configure({ ... })`         |
| `JSONPointer.resolve(ptr, data)`        | `resolve(ptr, data)`         |
| `JSONPatch.apply(ops, data)`            | `apply(ops, data)`           |
| `node.location`                         | `node.path`                  |
| `node.toPointer()`                      | `pathToPointer(node.path)`   |

#### Feature Equivalents

```typescript
// json-p3: Custom function
const env = new JSONPathEnvironment();
env.functionRegister.set('double', {
	argCount: 1,
	call: (args) => args[0] * 2,
});

// @jsonpath/*: Custom function
import { configure } from '@jsonpath/jsonpath';

configure({
	plugins: [
		{
			name: 'custom',
			setup(ctx) {
				ctx.registerFunction({
					name: 'double',
					signature: ['ValueType'],
					returns: 'ValueType',
					evaluate: (v) => (typeof v === 'number' ? v * 2 : null),
				});
			},
		},
	],
});
```

### 12.2 Migration Checklist

- [ ] Replace `json-p3` import with `@jsonpath/jsonpath`
- [ ] Update query calls: `env.query()` → `query()`
- [ ] Update pointer calls: `JSONPointer.resolve()` → `resolve()`
- [ ] Update patch calls: `JSONPatch.apply()` → `apply()`
- [ ] Convert custom functions to plugin format
- [ ] Update `node.location` to `node.path`
- [ ] Test all queries against expected results
- [ ] Run performance benchmarks

---

## 13. API Reference

### 13.1 Quick Reference

#### JSONPath

```typescript
// Query
query<T>(path: string, data: unknown): QueryResult<T>
compile<T>(path: string): CompiledQuery<T>
stream<T>(path: string, data: unknown): Generator<QueryNode<T>>
parse(path: string): ASTNode

// Configuration
configure(options: JSONPathConfig): void
getConfig(): JSONPathConfig
reset(): void
clearCache(): void
```

#### JSON Pointer

```typescript
// Parsing
parsePointer(pointer: string): PathSegment[]
stringifyPointer(path: PathSegment[]): string
isValidPointer(pointer: string): boolean

// Resolution
resolve<T>(pointer: string, data: unknown): T | undefined
resolveOrThrow<T>(pointer: string, data: unknown): T
exists(pointer: string, data: unknown): boolean
resolveWithParent<T>(pointer: string, data: unknown): ResolveWithParentResult<T>

// Mutation (immutable)
set<T>(pointer: string, data: T, value: unknown): T
remove<T>(pointer: string, data: T): T
append<T>(pointer: string, data: T, value: unknown): T

// Utilities
pointerParent(pointer: string): string
joinPointers(...pointers: string[]): string
escapePointer(token: string): string
unescapePointer(token: string): string
```

#### JSON Patch

```typescript
// Application
apply<T>(operations: PatchDocument, data: T, options?: ApplyOptions): T
applyWithErrors<T>(operations: PatchDocument, data: T): ApplyResult<T>

// Validation
validatePatch(operations: PatchDocument): ValidationError[]

// Diff
diff(source: unknown, target: unknown, options?: DiffOptions): PatchOperation[]

// Builder
class PatchBuilder {
  add(path: string, value: unknown): this
  remove(path: string): this
  replace(path: string, value: unknown): this
  move(from: string, to: string): this
  copy(from: string, to: string): this
  test(path: string, value: unknown): this
  apply<T>(data: T): T
  toOperations(): PatchOperation[]
}
```

### 13.2 Complete Type Definitions

See individual package specifications in Section 4 for complete type definitions.

---

## Appendix A: Grammar

### JSONPath Grammar (ABNF)

```abnf
jsonpath-query      = root-identifier segments
segments            = *(S (child-segment / descendant-segment))

root-identifier     = "$"
current-node-id     = "@"

child-segment       = (bracket-segment / dot-segment)
bracket-segment     = "[" S selectors S "]"
dot-segment         = "." (wildcard-selector / member-name-shorthand)

descendant-segment  = ".." (bracket-segment / wildcard-selector / member-name-shorthand)

selectors           = selector *(S "," S selector)
selector            = name-selector /
                      wildcard-selector /
                      slice-selector /
                      index-selector /
                      filter-selector

name-selector       = string-literal
wildcard-selector   = "*"
index-selector      = int
slice-selector      = [int] ":" [int] [":" [int]]
filter-selector     = "?" S logical-expr

member-name-shorthand = name-first *name-char
name-first          = ALPHA / "_" / %x80-10FFFF
name-char           = name-first / DIGIT

logical-expr        = logical-or-expr
logical-or-expr     = logical-and-expr *("||" S logical-and-expr)
logical-and-expr    = basic-expr *("&&" S basic-expr)
basic-expr          = paren-expr / comparison-expr / test-expr
paren-expr          = "(" S logical-expr S ")"
test-expr           = [logical-not-op S] (filter-query / function-expr)
logical-not-op      = "!"

comparison-expr     = comparable S comparison-op S comparable
comparison-op       = "==" / "!=" / "<=" / ">=" / "<" / ">"
comparable          = literal / singular-query / function-expr

literal             = number / string-literal / true / false / null
```

### JSON Pointer Grammar

```abnf
json-pointer    = *("/" reference-token)
reference-token = *( unescaped / escaped )
unescaped       = %x00-2E / %x30-7D / %x7F-10FFFF
escaped         = "~" ("0" / "1")
```

---

## Appendix B: Examples

### B.1 Basic Usage

```typescript
import { query, resolve, apply, PatchBuilder } from '@jsonpath/jsonpath';

const data = {
	store: {
		book: [
			{ title: 'A', price: 5, author: 'X' },
			{ title: 'B', price: 15, author: 'Y' },
			{ title: 'C', price: 25, author: 'X' },
		],
		bicycle: { color: 'red', price: 100 },
	},
};

// Query all book titles
const titles = query('$.store.book[*].title', data).values();
// ['A', 'B', 'C']

// Query books under $20
const cheap = query('$.store.book[?@.price < 20]', data).values();
// [{ title: 'A', ... }, { title: 'B', ... }]

// Get specific value with pointer
const firstTitle = resolve('/store/book/0/title', data);
// 'A'

// Apply patch
const patched = new PatchBuilder()
	.replace('/store/book/0/price', 7)
	.add('/store/book/-', { title: 'D', price: 30, author: 'Z' })
	.apply(data);
```

### B.2 With Plugins

```typescript
import { configure, query } from '@jsonpath/jsonpath';
import extended from '@jsonpath/plugin-extended';
import extras from '@jsonpath/plugin-extras';
import types from '@jsonpath/plugin-types';

configure({
	useCompiler: true,
	plugins: [extended, extras, types],
});

// Use extended selectors
const parents = query('$.store.book[*].^', data).values();
// [{ book: [...] }]

// Use extra functions
const expensive = query(
	'$.store.book[?@.price > avg($.store.book[*].price)]',
	data,
).values();

// Use type functions
const strings = query('$.store..*[?isString(@)]', data).values();
```

### B.3 Compiled Queries

```typescript
import { compile } from '@jsonpath/jsonpath';

// Compile once
const getExpensiveBooks = compile<Book>('$.store.book[?@.price > 20]');

// Execute many times
for (const catalog of catalogs) {
	const expensive = getExpensiveBooks(catalog).values();
	process(expensive);
}
```

### B.4 Streaming Large Data

```typescript
import { stream } from '@jsonpath/jsonpath';

// Process results as they're found
for (const node of stream('$..items[*]', hugeDataset)) {
	if (shouldStop(node.value)) {
		break; // Early termination
	}
	process(node.value);
}
```

### B.5 Data Transformation (for @data-map/core)

```typescript
import {
	transform,
	transformAll,
	project,
	pick,
	omit,
	merge,
} from '@jsonpath/jsonpath';

const userData = {
	user: {
		firstName: 'john',
		lastName: 'doe',
		email: 'JOHN@EXAMPLE.COM',
		password: 'secret123',
		preferences: { theme: 'dark' },
	},
	orders: [
		{ id: 1, total: 99.99, status: 'shipped' },
		{ id: 2, total: 149.5, status: 'pending' },
	],
};

// Transform single path - normalize email
const normalized = transform(userData, '$.user.email', (email) =>
	(email as string).toLowerCase(),
);

// Transform multiple paths at once
const formatted = transformAll(userData, [
	{ path: '$.user.firstName', fn: (v) => capitalize(v as string) },
	{ path: '$.user.lastName', fn: (v) => capitalize(v as string) },
	{
		path: '$.orders[*].total',
		fn: (v) => Math.round((v as number) * 100) / 100,
	},
]);

// Project into new structure (like GraphQL selection)
const apiResponse = project(userData, {
	name: '$.user.firstName',
	email: '$.user.email',
	orderCount: '$.orders.length',
	latestOrderId: '$.orders[-1].id',
});
// { name: 'john', email: 'john@example.com', orderCount: 2, latestOrderId: 2 }

// Pick specific paths (whitelist)
const safeUser = pick(userData, [
	'$.user.firstName',
	'$.user.lastName',
	'$.user.email',
	'$.user.preferences',
]);
// password is excluded

// Omit sensitive paths (blacklist)
const publicData = omit(userData, [
	'$.user.password',
	'$.orders[*].internalNotes',
]);

// Deep merge with options
const defaults = { user: { preferences: { theme: 'light', lang: 'en' } } };
const merged = merge(defaults, userData, { arrays: 'replace' });
```

### B.6 Bulk Operations with JSONPath

```typescript
import { PatchBuilder, applyWithJSONPath } from '@jsonpath/jsonpath';

const inventory = {
	products: [
		{ sku: 'A1', price: 100, stock: 50, category: 'electronics' },
		{ sku: 'B2', price: 200, stock: 30, category: 'electronics' },
		{ sku: 'C3', price: 50, stock: 100, category: 'accessories' },
	],
};

// Apply 10% discount to all electronics over $150
const discounted = new PatchBuilder()
	.transformAll(
		'$.products[?@.category == "electronics" && @.price > 150]',
		(product: any) => ({ ...product, price: product.price * 0.9 }),
	)
	.apply(inventory);

// Or use applyWithJSONPath directly
const updated = applyWithJSONPath(
	[
		{
			op: 'transform',
			jsonpath: '$.products[?@.stock < 40].status',
			transform: () => 'low-stock',
		},
		{
			op: 'replace',
			jsonpath: '$.products[*].lastUpdated',
			value: new Date().toISOString(),
		},
	],
	inventory,
);
```

### B.7 Undo/Redo with Inverse Patches

```typescript
import { applyWithInverse, apply } from '@jsonpath/jsonpath';

class UndoableDocument<T> {
	private current: T;
	private undoStack: PatchOperation[][] = [];
	private redoStack: PatchOperation[][] = [];

	constructor(initial: T) {
		this.current = initial;
	}

	apply(operations: PatchOperation[]): void {
		const { result, inverse } = applyWithInverse(operations, this.current);
		this.current = result;
		this.undoStack.push(inverse);
		this.redoStack = []; // Clear redo on new change
	}

	undo(): boolean {
		const inverse = this.undoStack.pop();
		if (!inverse) return false;

		const { result, inverse: redo } = applyWithInverse(inverse, this.current);
		this.current = result;
		this.redoStack.push(redo);
		return true;
	}

	redo(): boolean {
		const redo = this.redoStack.pop();
		if (!redo) return false;

		const { result, inverse } = applyWithInverse(redo, this.current);
		this.current = result;
		this.undoStack.push(inverse);
		return true;
	}

	get data(): T {
		return this.current;
	}
}

// Usage
const doc = new UndoableDocument({ name: 'Alice', score: 100 });
doc.apply([{ op: 'replace', path: '/score', value: 150 }]);
doc.apply([{ op: 'replace', path: '/name', value: 'Bob' }]);
doc.undo(); // Back to { name: 'Alice', score: 150 }
doc.undo(); // Back to { name: 'Alice', score: 100 }
doc.redo(); // Forward to { name: 'Alice', score: 150 }
```

### B.8 Multi-Query for Validation/Extraction

```typescript
import { createQuerySet, multiQuery } from '@jsonpath/jsonpath';

const apiResponse = {
	data: {
		users: [
			{ id: 1, name: 'Alice' },
			{ id: 2, name: 'Bob' },
		],
		meta: { total: 100, page: 1 },
	},
	errors: [],
	warnings: ['Rate limit approaching'],
};

// One-off multi-query
const extracted = multiQuery(apiResponse, {
	users: '$.data.users[*]',
	total: '$.data.meta.total',
	hasErrors: '$.errors[0]',
	warnings: '$.warnings[*]',
});

// Reusable query set (optimized single traversal)
const responseParser = createQuerySet({
	users: '$.data.users[*]',
	userIds: '$.data.users[*].id',
	pagination: '$.data.meta',
	errors: '$.errors[*]',
	warnings: '$.warnings[*]',
});

// Execute against multiple responses efficiently
for (const response of responses) {
	const { users, errors, warnings } = responseParser.execute(response);
	if (errors.length > 0) handleErrors(errors);
	processUsers(users.values());
}
```

### B.9 Conditional Patches

```typescript
import { PatchBuilder } from '@jsonpath/jsonpath';

const order = {
	status: 'pending',
	items: [{ sku: 'A1', qty: 2 }],
	shipping: { method: 'standard' },
	total: 199.99,
};

// Build conditional patch
const patch = new PatchBuilder()
	// Only apply if order is pending
	.when('$.status == "pending"')
	.replace('/status', 'processing')
	.add('/processedAt', new Date().toISOString())
	.endWhen()

	// Upgrade shipping if high-value order
	.when('$.total > 150')
	.replace('/shipping/method', 'express')
	.add('/shipping/priority', true)
	.endWhen()

	// Add field only if it doesn't exist
	.ifNotExists('/trackingNumber')
	.add('/trackingNumber', generateTrackingNumber())
	.endWhen();

const processed = patch.apply(order);
```

### B.10 Path Builder for Dynamic Queries

```typescript
import { PathBuilder, pathBuilder } from '@jsonpath/plugin-path-builder';
import { query } from '@jsonpath/jsonpath';

// Build query based on user input
function searchProducts(filters: ProductFilters) {
	let path = pathBuilder().child('products');

	// Build filter expression dynamically
	const conditions: string[] = [];

	if (filters.category) {
		conditions.push(`@.category == "${filters.category}"`);
	}
	if (filters.minPrice !== undefined) {
		conditions.push(`@.price >= ${filters.minPrice}`);
	}
	if (filters.maxPrice !== undefined) {
		conditions.push(`@.price <= ${filters.maxPrice}`);
	}
	if (filters.inStock) {
		conditions.push('@.stock > 0');
	}

	if (conditions.length > 0) {
		path = path.filter(conditions.join(' && '));
	}

	return query(path.build(), catalog).values();
}

// Complex path building
const reportQuery = pathBuilder()
	.child('departments')
	.filter((f) => f.current().field('active').eq(true))
	.child('employees')
	.filter((f) =>
		f
			.current()
			.field('role')
			.eq('engineer')
			.and((fb) => fb.current().field('yearsOfService').gte(5)),
	)
	.child('projects')
	.wildcard()
	.build();
// '$.departments[?@.active == true].employees[?@.role == "engineer" && @.yearsOfService >= 5].projects[*]'
```

### B.11 Integration with @data-map/core

```typescript
import {
	query,
	compile,
	transform,
	PatchBuilder,
	pathToPointer,
} from '@jsonpath/jsonpath';

class DataMap<T extends object> {
	private data: T;
	private compiledQueries = new Map<string, CompiledQuery>();

	constructor(initial: T) {
		this.data = initial;
	}

	// Query with automatic caching
	query<R = unknown>(path: string): R[] {
		let compiled = this.compiledQueries.get(path);
		if (!compiled) {
			compiled = compile(path);
			this.compiledQueries.set(path, compiled);
		}
		return compiled(this.data).values() as R[];
	}

	// Get single value
	get<R = unknown>(path: string): R | undefined {
		return this.query<R>(path)[0];
	}

	// Set values at path
	set(path: string, value: unknown): this {
		const nodes = query(path, this.data).nodes();
		const builder = new PatchBuilder();

		for (const node of nodes) {
			builder.replace(pathToPointer(node.path), value);
		}

		this.data = builder.apply(this.data);
		return this;
	}

	// Transform values at path
	transform(path: string, fn: (value: unknown) => unknown): this {
		this.data = transform(this.data, path, fn);
		return this;
	}

	// Update with partial data
	update(updates: Partial<T>): this {
		this.data = merge(this.data, updates);
		return this;
	}

	// Subscribe to changes at path (basic implementation)
	watch(path: string, callback: (values: unknown[]) => void): () => void {
		let lastValues = JSON.stringify(this.query(path));

		const check = () => {
			const currentValues = JSON.stringify(this.query(path));
			if (currentValues !== lastValues) {
				lastValues = currentValues;
				callback(this.query(path));
			}
		};

		const interval = setInterval(check, 100);
		return () => clearInterval(interval);
	}

	// Export current state
	toJSON(): T {
		return structuredClone(this.data);
	}
}

// Usage
const store = new DataMap({
	user: { name: 'Alice', preferences: { theme: 'dark' } },
	cart: { items: [], total: 0 },
});

store
	.set('$.user.name', 'Bob')
	.transform('$.user.name', (n) => (n as string).toUpperCase())
	.update({ cart: { items: [{ id: 1, qty: 2 }] } });

const userName = store.get<string>('$.user.name'); // 'BOB'
```

---

## Appendix C: Changelog

### 1.0.0 (Initial Release)

**Core Features**:

- Full RFC 9535 JSONPath compliance
- Full RFC 6901 JSON Pointer compliance (including Relative JSON Pointers)
- Full RFC 6902 JSON Patch compliance
- Full RFC 7386 JSON Merge Patch compliance
- Interpreter and compiler execution modes
- Plugin system for extensions
- TypeScript-first with complete type definitions
- Zero runtime dependencies
- <15KB gzipped bundle size

**Query Enhancements**:

- `match()` function for single-result queries
- `value()` function for direct value extraction
- `exists()` function for existence checks
- `count()` function for optimized counting
- Multi-query optimization with `multiQuery()` and `createQuerySet()`
- Streaming/generator-based results with `stream()`
- Normalized path output (RFC 9535 format)

**Data Transformation API**:

- `transform()` for value transformation at paths
- `transformAll()` for multiple path transformations
- `project()` for extracting fields into new structure
- `pick()` and `omit()` for path-based filtering
- `merge()` and `mergeWith()` for deep object merging

**Patch Enhancements**:

- Inverse patch generation with `applyWithInverse()`
- Before/after hooks for patch operations
- JSONPath-based bulk operations with `applyWithJSONPath()`
- Conditional patch operations (`when()`, `ifExists()`, `ifNotExists()`)
- Enhanced `PatchBuilder` with `transformAll()`, `replaceAll()`, `removeAll()`

**Security Features**:

- Query complexity limits (`maxNodes`, `maxFilterDepth`)
- Path allowlist/blocklist via `SecureQueryOptions`
- Circular reference detection
- Timeout support for long-running queries

**Plugins**:

- `@jsonpath/plugin-extended` - Parent (^) and property name (~) selectors
- `@jsonpath/plugin-types` - Type checking functions
- `@jsonpath/plugin-arithmetic` - Arithmetic operators in filters
- `@jsonpath/plugin-extras` - String, array, and aggregation functions
- `@jsonpath/plugin-path-builder` - Fluent API for query construction

---
