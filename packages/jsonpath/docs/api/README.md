# API Reference

Quick reference for all exported functions and types.

## @jsonpath/jsonpath (Facade)

The main entry point that re-exports everything.

### Query Functions

| Function                      | Description                         |
| ----------------------------- | ----------------------------------- |
| `query(data, path, options?)` | Execute query, return `QueryResult` |
| `queryValues(data, path)`     | Get matched values as array         |
| `queryPaths(data, path)`      | Get matched paths as arrays         |
| `value(data, path)`           | Get first matched value             |
| `exists(data, path)`          | Check if any match exists           |
| `count(data, path)`           | Count matches                       |

### Compilation

| Function             | Description             |
| -------------------- | ----------------------- |
| `compile(path)`      | Compile query for reuse |
| `compileQuery(path)` | Alias for `compile`     |

### Transformation

| Function                    | Description                     |
| --------------------------- | ------------------------------- |
| `transform(data, path, fn)` | Transform matched values        |
| `pick(data, path, keys)`    | Keep only specified keys        |
| `omit(data, path, keys)`    | Remove specified keys           |
| `project(data, keys)`       | Project array to subset of keys |

### Streaming

| Function             | Description                   |
| -------------------- | ----------------------------- |
| `stream(data, path)` | Iterate matches one at a time |

### Configuration

| Function             | Description         |
| -------------------- | ------------------- |
| `configure(options)` | Set global defaults |
| `getConfig()`        | Get current config  |
| `resetConfig()`      | Reset to defaults   |

---

## @jsonpath/core

Foundation types and utilities.

### Types

```typescript
type JSONValue =
	| string
	| number
	| boolean
	| null
	| JSONValue[]
	| { [key: string]: JSONValue };

interface EvaluatorOptions {
	maxDepth?: number;
	maxResults?: number;
	timeout?: number;
	throwOnError?: boolean;
}

interface FunctionDefinition {
	name: string;
	returnType: 'value' | 'nodes' | 'logical';
	params: { name: string; type: string }[];
	evaluate: (...args: any[]) => any;
}
```

### Errors

| Class                   | Description            |
| ----------------------- | ---------------------- |
| `JSONPathError`         | Base error class       |
| `JSONPathSyntaxError`   | Parse errors           |
| `JSONPathTypeError`     | Type mismatches        |
| `JSONPointerError`      | Pointer errors         |
| `JSONPatchError`        | Patch operation errors |
| `JSONPathLimitError`    | Resource limits        |
| `JSONPathTimeoutError`  | Query timeout          |
| `JSONPathSecurityError` | Security violations    |

### Utilities

| Function             | Description          |
| -------------------- | -------------------- |
| `deepEqual(a, b)`    | Deep equality check  |
| `deepClone(value)`   | Deep clone           |
| `freeze(value)`      | Deep freeze          |
| `isObject(value)`    | Object type guard    |
| `isArray(value)`     | Array type guard     |
| `isPrimitive(value)` | Primitive type guard |

---

## @jsonpath/parser

Parse JSONPath expressions to AST.

### Functions

| Function                   | Description                             |
| -------------------------- | --------------------------------------- |
| `parse(path)`              | Parse to AST                            |
| `walk(node, visitor)`      | Visit all nodes                         |
| `transform(node, visitor)` | Transform nodes                         |
| `isSingularQuery(node)`    | Check if query returns at most 1 result |

### Node Types

```typescript
type NodeType =
	| 'Query'
	| 'Segment'
	| 'Child'
	| 'Descendant'
	| 'NameSelector'
	| 'IndexSelector'
	| 'WildcardSelector'
	| 'SliceSelector'
	| 'FilterSelector'
	| 'UnionSelector'
	| 'BinaryExpression'
	| 'UnaryExpression'
	| 'FunctionCall'
	| 'Literal'
	| 'CurrentNode'
	| 'RootNode';
```

---

## @jsonpath/evaluator

Execute JSONPath queries.

### Classes

```typescript
class Evaluator {
	constructor(options?: EvaluatorOptions);
	evaluate(data: JSONValue, query: QueryNode): QueryResult;
}

class QueryResult {
	values(): JSONValue[];
	paths(): string[][];
	pointers(): string[];
	normalizedPaths(): string[];
	isEmpty(): boolean;
	count(): number;
	map<T>(fn: (v: JSONValue) => T): T[];
	filter(fn: (v: JSONValue) => boolean): JSONValue[];
	forEach(fn: (v: JSONValue) => void): void;
	[Symbol.iterator](): Iterator<JSONValue>;
}
```

---

## @jsonpath/pointer

JSON Pointer operations (RFC 6901).

### Class

```typescript
class JSONPointer {
	constructor(input: string | string[]);
	static parse(pointer: string): string[];
	static format(tokens: string[]): string;
	getTokens(): string[];
	evaluate(data: JSONValue): JSONValue | undefined;
	toString(): string;
}
```

### Functions

| Function                           | Description                   |
| ---------------------------------- | ----------------------------- |
| `resolve(data, pointer)`           | Get value at pointer          |
| `resolveOrThrow(data, pointer)`    | Get value or throw            |
| `exists(data, pointer)`            | Check pointer exists          |
| `resolveWithParent(data, pointer)` | Get value with parent context |
| `set(data, pointer, value)`        | Set value (immutable)         |
| `remove(data, pointer)`            | Remove value (immutable)      |
| `append(data, pointer, value)`     | Append to array (immutable)   |
| `parent(pointer)`                  | Get parent pointer            |
| `join(...segments)`                | Join pointer segments         |
| `split(pointer)`                   | Split to tokens               |
| `escape(token)`                    | Escape special chars          |
| `unescape(token)`                  | Unescape token                |
| `isValid(pointer)`                 | Check syntax validity         |
| `validate(pointer)`                | Get validation result         |
| `toNormalizedPath(pointer)`        | Convert to RFC 9535 path      |
| `fromNormalizedPath(path)`         | Convert from normalized path  |

---

## @jsonpath/patch

JSON Patch operations (RFC 6902).

### Types

```typescript
type JSONPatchOp = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

interface JSONPatchOperation {
	op: JSONPatchOp;
	path: string;
	value?: JSONValue;
	from?: string;
}
```

### Functions

| Function                        | Description              |
| ------------------------------- | ------------------------ |
| `applyPatch(data, patch)`       | Apply patch operations   |
| `applyWithInverse(data, patch)` | Apply and get inverse    |
| `diff(source, target)`          | Generate patch from diff |

### PatchBuilder

```typescript
class PatchBuilder {
	add(path: string, value: JSONValue): this;
	remove(path: string): this;
	replace(path: string, value: JSONValue): this;
	move(from: string, path: string): this;
	copy(from: string, path: string): this;
	test(path: string, value: JSONValue): this;
	build(): JSONPatchOperation[];
}
```

---

## @jsonpath/merge-patch

JSON Merge Patch (RFC 7386).

### Functions

| Function                         | Description       |
| -------------------------------- | ----------------- |
| `applyMergePatch(target, patch)` | Apply merge patch |

---

## @jsonpath/functions

Built-in filter functions.

### Functions

| Function | Signature                        | Description            |
| -------- | -------------------------------- | ---------------------- |
| `length` | `length(x) → number`             | String or array length |
| `count`  | `count(nodes) → number`          | Count node list        |
| `match`  | `match(str, pattern) → boolean`  | Regex full match       |
| `search` | `search(str, pattern) → boolean` | Regex search           |
| `value`  | `value(nodes) → any`             | Get single value       |

---

## @jsonpath/compiler

Query compilation and caching.

### Types

```typescript
type CompiledQuery = (data: JSONValue) => QueryResult;
```

### Functions

| Function        | Description                  |
| --------------- | ---------------------------- |
| `compile(path)` | Compile to reusable function |
| `clearCache()`  | Clear the query cache        |

---

## @jsonpath/lexer

Tokenize JSONPath expressions.

### Types

```typescript
interface Token {
	type: TokenType;
	value: string;
	start: number;
	end: number;
}

enum TokenType {
	ROOT,
	CURRENT,
	DOT,
	DOT_DOT,
	LBRACKET,
	RBRACKET,
	LPAREN,
	RPAREN,
	STAR,
	COLON,
	COMMA,
	QUESTION,
	STRING,
	NUMBER,
	TRUE,
	FALSE,
	NULL,
	NAME,
	COMPARISON,
	LOGICAL,
	NOT,
	EOF,
}
```

### Class

```typescript
class Lexer {
	constructor(input: string);
	next(): Token;
	peek(): Token;
	peekAhead(n: number): Token;
}
```
