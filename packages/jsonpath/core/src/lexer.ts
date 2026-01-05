/**
 * @jsonpath/core
 *
 * Lexer interfaces and token types for JSONPath.
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
 * Character code constants for common characters.
 */
export enum CharCode {
	TAB = 9,
	LF = 10,
	CR = 13,
	SPACE = 32,
	BANG = 33, // !
	DOUBLE_QUOTE = 34, // "
	PERCENT = 37, // %
	DOLLAR = 36, // $
	SINGLE_QUOTE = 39, // '
	LPAREN = 40, // (
	RPAREN = 41, // )
	ASTERISK = 42, // *
	PLUS = 43, // +
	COMMA = 44, // ,
	MINUS = 45, // -
	DOT = 46, // .
	SLASH = 47, // /
	ZERO = 48,
	ONE = 49,
	TWO = 50,
	THREE = 51,
	FOUR = 52,
	FIVE = 53,
	SIX = 54,
	SEVEN = 55,
	EIGHT = 56,
	NINE = 57,
	COLON = 58, // :
	LT = 60, // <
	EQ = 61, // =
	GT = 62, // >
	QUESTION = 63, // ?
	AT = 64, // @
	LBRACKET = 91, // [
	BACKSLASH = 92, // \
	RBRACKET = 93, // ]
	CARET = 94, // ^
	UNDERSCORE = 95, // _
	BACKTICK = 96, // `
	LBRACE = 123, // {
	PIPE = 124, // |
	RBRACE = 125, // }
	TILDE = 126, // ~
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
	readonly column: number;
	/** Column number (1-indexed) */
	readonly line: number;
}

/**
 * Interface for a JSONPath Lexer.
 */
export interface LexerInterface {
	/** Get the next token and advance the position */
	next: () => Token;
	/** Peek at the next token without advancing */
	peek: () => Token;
	/** Peek ahead n tokens without advancing */
	peekAhead: (n: number) => Token;
	/** Check if the lexer has reached the end of the input */
	isAtEnd: () => boolean;
	/** Current position in the input string */
	readonly position: number;
	/** The input string being tokenized */
	readonly input: string;
}
