# @jsonpath/lexer

> High-performance tokenizer for JSONPath query strings.

## Overview

`@jsonpath/lexer` tokenizes JSONPath query strings into a stream of tokens for consumption by the parser. It uses ASCII lookup tables for fast character classification, enabling efficient tokenization of complex queries.

## Features

- **High Performance**: ASCII lookup tables for O(1) character classification
- **Full RFC 9535 Support**: All JSONPath token types
- **Rich Error Messages**: Position-accurate syntax errors
- **Streaming Interface**: Peek, look-ahead, and consume tokens

## Installation

```bash
pnpm add @jsonpath/lexer
```

## API Reference

### Lexer Class

```typescript
import { Lexer } from '@jsonpath/lexer';

const lexer = new Lexer('$.store.book[0].title');

// Consume and return next token
const token = lexer.next();

// Peek at next token without consuming
const upcoming = lexer.peek();

// Look ahead n tokens
const future = lexer.peekAhead(2);

// Check if at end of input
const done = lexer.isAtEnd();

// Access input and position
console.log(lexer.input); // '$.store.book[0].title'
console.log(lexer.position); // Current position in input
```

### LexerInterface

The interface implemented by the Lexer:

```typescript
interface LexerInterface {
	next: () => Token;
	peek: () => Token;
	peekAhead: (n: number) => Token;
	isAtEnd: () => boolean;
	readonly position: number;
	readonly input: string;
}
```

### Token Interface

```typescript
interface Token {
	/** The type of the token */
	readonly type: TokenType;

	/** The value of the token (parsed for literals) */
	readonly value: string | number | boolean | null;

	/** The raw string value of the token */
	readonly raw?: string;

	/** Start position in the input string (0-indexed) */
	readonly start: number;

	/** End position in the input string (0-indexed) */
	readonly end: number;

	/** Line number (1-indexed) */
	readonly line: number;

	/** Column number (1-indexed) */
	readonly column: number;
}
```

### TokenType Enum

```typescript
const enum TokenType {
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
```

---

## How It Works

### Character Classification

The lexer uses pre-computed lookup tables for fast character classification:

```typescript
import {
	CHAR_FLAGS,
	IS_WHITESPACE,
	IS_DIGIT,
	IS_IDENT_START,
} from '@jsonpath/lexer';

// Check if character is whitespace
const isWhitespace = (CHAR_FLAGS[charCode] & IS_WHITESPACE) !== 0;

// Check if character can start an identifier
const isIdentStart = (CHAR_FLAGS[charCode] & IS_IDENT_START) !== 0;
```

**Flag Constants:**

| Flag             | Description                          |
| ---------------- | ------------------------------------ |
| `IS_WHITESPACE`  | Space, tab, newline, carriage return |
| `IS_DIGIT`       | 0-9                                  |
| `IS_IDENT_START` | a-z, A-Z, \_                         |
| `IS_IDENT_CONT`  | a-z, A-Z, 0-9, \_                    |
| `IS_OPERATOR`    | =, !, <, >, &, \|                    |
| `IS_HEX`         | 0-9, a-f, A-F                        |

### Tokenization Process

1. **Whitespace Skipping**: Leading whitespace is skipped between tokens
2. **Single-Character Tokens**: `$`, `@`, `.`, `[`, `]`, etc.
3. **Multi-Character Tokens**: `..`, `==`, `!=`, `<=`, `>=`, `&&`, `||`
4. **Strings**: Single or double-quoted with escape sequence handling
5. **Numbers**: Integers, decimals, and scientific notation
6. **Identifiers**: Unquoted names and keywords (`true`, `false`, `null`)

---

## Usage Examples

### Basic Tokenization

```typescript
import { Lexer, TokenType } from '@jsonpath/lexer';

const lexer = new Lexer('$.store.book[*]');
const tokens: Token[] = [];

while (!lexer.isAtEnd()) {
	tokens.push(lexer.next());
}
tokens.push(lexer.next()); // EOF token

console.log(tokens.map((t) => t.type));
// ['ROOT', 'DOT', 'IDENT', 'DOT', 'IDENT', 'LBRACKET', 'WILDCARD', 'RBRACKET', 'EOF']
```

### Token Inspection

```typescript
import { Lexer, TokenType } from '@jsonpath/lexer';

const lexer = new Lexer('$.price == 10.99');

while (!lexer.isAtEnd()) {
	const token = lexer.next();
	console.log({
		type: token.type,
		value: token.value,
		raw: token.raw,
		position: `${token.line}:${token.column}`,
	});
}

// Output:
// { type: 'ROOT', value: '$', raw: undefined, position: '1:1' }
// { type: 'DOT', value: '.', raw: undefined, position: '1:2' }
// { type: 'IDENT', value: 'price', raw: undefined, position: '1:3' }
// { type: 'EQ', value: '==', raw: undefined, position: '1:9' }
// { type: 'NUMBER', value: 10.99, raw: '10.99', position: '1:12' }
```

### String Escape Sequences

The lexer handles all RFC 9535 escape sequences:

```typescript
import { Lexer } from '@jsonpath/lexer';

// Standard escapes
new Lexer("'hello\\nworld'").next(); // value: 'hello\nworld'
new Lexer("'path\\\\to'").next(); // value: 'path\\to'

// Unicode escapes
new Lexer("'\\u0041'").next(); // value: 'A'

// Surrogate pairs (emoji)
new Lexer("'\\uD83D\\uDE00'").next(); // value: '😀'

// Quote escapes (context-sensitive)
new Lexer("'it\\'s'").next(); // value: "it's"
new Lexer('"say \\"hi\\""').next(); // value: 'say "hi"'
```

### Number Parsing

```typescript
import { Lexer } from '@jsonpath/lexer';

// Integers
new Lexer('42').next().value; // 42
new Lexer('-17').next().value; // -17

// Decimals
new Lexer('3.14').next().value; // 3.14
new Lexer('-0.5').next().value; // -0.5

// Scientific notation
new Lexer('1e10').next().value; // 10000000000
new Lexer('1.5E-3').next().value; // 0.0015

// RFC 9535: Leading zeros are not allowed
new Lexer('007').next(); // throws JSONPathSyntaxError
```

---

## Error Handling

The lexer throws `JSONPathSyntaxError` for invalid input:

```typescript
import { Lexer } from '@jsonpath/lexer';
import { JSONPathSyntaxError } from '@jsonpath/core';

try {
	new Lexer("'unterminated").next();
} catch (err) {
	if (err instanceof JSONPathSyntaxError) {
		console.log(err.code); // 'SYNTAX_ERROR'
		console.log(err.message); // 'Unterminated string literal'
		console.log(err.position); // 0
	}
}
```

**Common Lexer Errors:**

| Error                       | Cause                         |
| --------------------------- | ----------------------------- |
| Unterminated string literal | Missing closing quote         |
| Invalid escape sequence     | Unknown escape like `\x`      |
| Invalid unicode escape      | Malformed `\uXXXX`            |
| Leading zeros not allowed   | Numbers like `007`            |
| Unpaired surrogate          | Invalid UTF-16 surrogate pair |
| Unescaped control character | Raw control chars in strings  |

---

## Performance Considerations

The lexer is designed for high performance:

1. **Single-Pass Tokenization**: All tokens are generated upfront in the constructor
2. **ASCII Lookup Tables**: O(1) character classification using bitwise operations
3. **Minimal Allocations**: Tokens reuse string slices when possible
4. **Efficient String Building**: Escape sequence handling minimizes string concatenation

For very long queries, consider the `maxQueryLength` security option in the evaluator to prevent DoS attacks.
