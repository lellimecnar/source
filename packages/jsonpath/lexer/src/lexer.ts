/**
 * @jsonpath/lexer
 *
 * High-performance Lexer for JSONPath query strings.
 *
 * @packageDocumentation
 */

import { JSONPathSyntaxError } from '@jsonpath/core';
import { TokenType, type Token } from './tokens.js';
import { CHAR_FLAGS, IS_WHITESPACE, IS_DIGIT, IS_IDENT_START, IS_IDENT_CONT, IS_OPERATOR, CharCode } from './char-tables.js';

export interface LexerInterface {
	next(): Token;
	peek(): Token;
	peekAhead(n: number): Token;
	isAtEnd(): boolean;
	readonly position: number;
	readonly input: string;
}

export class Lexer implements LexerInterface {
	private pos = 0;
	private line = 1;
	private column = 1;
	private tokens: Token[] = [];
	private tokenIndex = 0;

	constructor(public readonly input: string) {
		this.tokenizeAll();
	}

	public next(): Token {
		return this.tokens[this.tokenIndex++] ?? this.tokens[this.tokens.length - 1]!;
	}

	public peek(): Token {
		return this.tokens[this.tokenIndex] ?? this.tokens[this.tokens.length - 1]!;
	}

	public peekAhead(n: number): Token {
		return this.tokens[this.tokenIndex + n] ?? this.tokens[this.tokens.length - 1]!;
	}

	public isAtEnd(): boolean {
		return this.tokenIndex >= this.tokens.length - 1;
	}

	public get position(): number {
		return this.pos;
	}

	private tokenizeAll(): void {
		while (this.pos < this.input.length) {
			this.skipWhitespace();
			if (this.pos >= this.input.length) break;

			const charCode = this.input.charCodeAt(this.pos);
			const start = this.pos;
			const line = this.line;
			const col = this.column;

			// Structural and single-character tokens
			switch (charCode) {
				case CharCode.DOLLAR:
					this.advance();
					this.tokens.push(this.createToken(TokenType.ROOT, '$', start, line, col));
					continue;
				case CharCode.AT:
					this.advance();
					this.tokens.push(this.createToken(TokenType.CURRENT, '@', start, line, col));
					continue;
				case CharCode.DOT:
					if (this.input.charCodeAt(this.pos + 1) === CharCode.DOT) {
						this.advance();
						this.advance();
						this.tokens.push(this.createToken(TokenType.DOT_DOT, '..', start, line, col));
					} else {
						this.advance();
						this.tokens.push(this.createToken(TokenType.DOT, '.', start, line, col));
					}
					continue;
				case CharCode.LBRACKET:
					this.advance();
					this.tokens.push(this.createToken(TokenType.LBRACKET, '[', start, line, col));
					continue;
				case CharCode.RBRACKET:
					this.advance();
					this.tokens.push(this.createToken(TokenType.RBRACKET, ']', start, line, col));
					continue;
				case CharCode.LPAREN:
					this.advance();
					this.tokens.push(this.createToken(TokenType.LPAREN, '(', start, line, col));
					continue;
				case CharCode.RPAREN:
					this.advance();
					this.tokens.push(this.createToken(TokenType.RPAREN, ')', start, line, col));
					continue;
				case CharCode.COMMA:
					this.advance();
					this.tokens.push(this.createToken(TokenType.COMMA, ',', start, line, col));
					continue;
				case CharCode.COLON:
					this.advance();
					this.tokens.push(this.createToken(TokenType.COLON, ':', start, line, col));
					continue;
				case CharCode.ASTERISK:
					this.advance();
					this.tokens.push(this.createToken(TokenType.WILDCARD, '*', start, line, col));
					continue;
				case CharCode.QUESTION:
					this.advance();
					this.tokens.push(this.createToken(TokenType.FILTER, '?', start, line, col));
					continue;
			}

			// Strings
			if (charCode === CharCode.SINGLE_QUOTE || charCode === CharCode.DOUBLE_QUOTE) {
				this.tokens.push(this.readString(charCode));
				continue;
			}

			// Numbers
			if ((charCode < 128 && (CHAR_FLAGS[charCode]! & IS_DIGIT)) || charCode === CharCode.MINUS) {
				this.tokens.push(this.readNumber());
				continue;
			}

			// Identifiers and Keywords
			if ((charCode < 128 && (CHAR_FLAGS[charCode]! & IS_IDENT_START)) || charCode > 127) {
				this.tokens.push(this.readIdentOrKeyword());
				continue;
			}

			// Operators
			if (charCode < 128 && (CHAR_FLAGS[charCode]! & IS_OPERATOR)) {
				this.tokens.push(this.readOperator());
				continue;
			}

			// Error
			const errorChar = this.input[this.pos];
			this.advance();
			this.tokens.push(this.createToken(TokenType.ERROR, errorChar, start, line, col));
		}

		this.tokens.push(this.createToken(TokenType.EOF, '', this.pos, this.line, this.column));
	}

	private skipWhitespace(): void {
		while (this.pos < this.input.length) {
			const charCode = this.input.charCodeAt(this.pos);
			if (charCode < 128 && (CHAR_FLAGS[charCode]! & IS_WHITESPACE)) {
				this.advance();
			} else {
				break;
			}
		}
	}

	private readString(quote: number): Token {
		const start = this.pos;
		const line = this.line;
		const col = this.column;
		this.advance(); // skip opening quote

		let value = '';
		while (this.pos < this.input.length) {
			const charCode = this.input.charCodeAt(this.pos);
			if (charCode === quote) {
				this.advance(); // skip closing quote
				return this.createToken(TokenType.STRING, value, start, line, col);
			}

			if (charCode === CharCode.BACKSLASH) {
				this.advance();
				if (this.pos >= this.input.length) break;
				const escaped = this.input.charCodeAt(this.pos);
				switch (escaped) {
					case 110: value += '\n'; break; // n
					case 114: value += '\r'; break; // r
					case 116: value += '\t'; break; // t
					case 98: value += '\b'; break; // b
					case 102: value += '\f'; break; // f
					case 117: // uXXXX
						this.advance();
						const hex = this.input.slice(this.pos, this.pos + 4);
						if (/^[0-9a-fA-F]{4}$/.test(hex)) {
							value += String.fromCharCode(parseInt(hex, 16));
							this.pos += 3; // advance will do the 4th
							this.column += 3;
						} else {
							value += 'u' + hex;
						}
						break;
					default:
						value += String.fromCharCode(escaped);
				}
			} else {
				value += this.input[this.pos];
			}
			this.advance();
		}

		return this.createToken(TokenType.ERROR, value, start, line, col);
	}

	private readNumber(): Token {
		const start = this.pos;
		const line = this.line;
		const col = this.column;
		let raw = '';

		if (this.input.charCodeAt(this.pos) === CharCode.MINUS) {
			raw += '-';
			this.advance();
		}

		while (this.pos < this.input.length) {
			const code = this.input.charCodeAt(this.pos);
			if (code < 128 && (CHAR_FLAGS[code]! & IS_DIGIT)) {
				raw += this.input[this.pos];
				this.advance();
			} else {
				break;
			}
		}

		if (this.pos < this.input.length && this.input.charCodeAt(this.pos) === CharCode.DOT) {
			raw += '.';
			this.advance();
			while (this.pos < this.input.length) {
				const code = this.input.charCodeAt(this.pos);
				if (code < 128 && (CHAR_FLAGS[code]! & IS_DIGIT)) {
					raw += this.input[this.pos];
					this.advance();
				} else {
					break;
				}
			}
		}

		if (this.pos < this.input.length && (this.input[this.pos] === 'e' || this.input[this.pos] === 'E')) {
			raw += this.input[this.pos];
			this.advance();
			if (this.pos < this.input.length && (this.input[this.pos] === '+' || this.input[this.pos] === '-')) {
				raw += this.input[this.pos];
				this.advance();
			}
			while (this.pos < this.input.length) {
				const code = this.input.charCodeAt(this.pos);
				if (code < 128 && (CHAR_FLAGS[code]! & IS_DIGIT)) {
					raw += this.input[this.pos];
					this.advance();
				} else {
					break;
				}
			}
		}

		return this.createToken(TokenType.NUMBER, parseFloat(raw), start, line, col);
	}

	private readIdentOrKeyword(): Token {
		const start = this.pos;
		const line = this.line;
		const col = this.column;
		let value = '';

		while (this.pos < this.input.length) {
			const charCode = this.input.charCodeAt(this.pos);
			if (charCode > 127 || (charCode < 128 && (CHAR_FLAGS[charCode]! & IS_IDENT_CONT))) {
				value += this.input[this.pos];
				this.advance();
			} else {
				break;
			}
		}

		switch (value) {
			case 'true': return this.createToken(TokenType.TRUE, true, start, line, col);
			case 'false': return this.createToken(TokenType.FALSE, false, start, line, col);
			case 'null': return this.createToken(TokenType.NULL, null, start, line, col);
		}

		return this.createToken(TokenType.IDENT, value, start, line, col);
	}

	private readOperator(): Token {
		const start = this.pos;
		const line = this.line;
		const col = this.column;
		const char = this.input[this.pos];
		this.advance();

		const nextChar = this.input[this.pos];
		if (char === '=' && nextChar === '=') {
			this.advance();
			return this.createToken(TokenType.EQ, '==', start, line, col);
		}
		if (char === '!' && nextChar === '=') {
			this.advance();
			return this.createToken(TokenType.NE, '!=', start, line, col);
		}
		if (char === '<' && nextChar === '=') {
			this.advance();
			return this.createToken(TokenType.LE, '<=', start, line, col);
		}
		if (char === '>' && nextChar === '=') {
			this.advance();
			return this.createToken(TokenType.GE, '>=', start, line, col);
		}
		if (char === '&' && nextChar === '&') {
			this.advance();
			return this.createToken(TokenType.AND, '&&', start, line, col);
		}
		if (char === '|' && nextChar === '|') {
			this.advance();
			return this.createToken(TokenType.OR, '||', start, line, col);
		}

		if (char === '<') return this.createToken(TokenType.LT, '<', start, line, col);
		if (char === '>') return this.createToken(TokenType.GT, '>', start, line, col);
		if (char === '!') return this.createToken(TokenType.NOT, '!', start, line, col);

		return this.createToken(TokenType.ERROR, char, start, line, col);
	}

	private advance(): void {
		const charCode = this.input.charCodeAt(this.pos);
		if (charCode === CharCode.LF) {
			this.line++;
			this.column = 1;
		} else {
			this.column++;
		}
		this.pos++;
	}

	private peekChar(): number {
		return this.input.charCodeAt(this.pos);
	}

	private createToken(type: TokenType, value: any, start: number, line: number, col: number): Token {
		return {
			type,
			value,
			start,
			end: this.pos,
			line,
			column: col,
		};
	}
}

export function createLexer(input: string): Lexer {
	return new Lexer(input);
}

export function tokenize(input: string): Token[] {
	const lexer = new Lexer(input);
	const tokens: Token[] = [];
	while (true) {
		const token = lexer.next();
		tokens.push(token);
		if (token.type === TokenType.EOF) break;
	}
	return tokens;
}
