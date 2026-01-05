/**
 * @jsonpath/lexer
 *
 * Token types and interfaces for JSONPath tokenization.
 *
 * @packageDocumentation
 */

/**
 * Token types for JSONPath query strings.
 */
export const enum TokenType {
	// Structural
	ROOT = 'ROOT', // $
	CURRENT = 'CURRENT', // @
	DOT = 'DOT', // .
	DOT_DOT = 'DOT_DOT', // ..
	LBRACKET = 'LBRACKET', // [
	RBRACKET = 'RBRACKET', // ]
	LBRACE = 'LBRACE', // {
	RBRACE = 'RBRACE', // }
	LPAREN = 'LPAREN', // (
	RPAREN = 'RPAREN', // )
	COMMA = 'COMMA', // ,
	COLON = 'COLON', // :
	WILDCARD = 'WILDCARD', // *
	FILTER = 'FILTER', // ?
	PARENT = 'PARENT', // ^
	PROPERTY = 'PROPERTY', // ~

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

	// Arithmetic operators
	PLUS = 'PLUS', // +
	MINUS = 'MINUS', // -
	MUL = 'MUL', // *
	DIV = 'DIV', // /
	MOD = 'MOD', // %

	// Special
	EOF = 'EOF',
	ERROR = 'ERROR',
}

/**
 * Represents a single token in a JSONPath query string.
 */
export interface Token {
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
