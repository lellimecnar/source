import type { Scanner } from './scanner';
import { TokenKinds } from './token';

function isAlpha(ch: string): boolean {
	return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isDigit(ch: string): boolean {
	return ch >= '0' && ch <= '9';
}

export function registerRfc9535LiteralScanRules(scanner: Scanner): void {
	// Identifiers (for dot-notation names): [A-Za-z_][A-Za-z0-9_]*
	scanner.register(TokenKinds.Identifier, (input, offset) => {
		const first = input[offset];
		if (!first || !isAlpha(first)) return null;
		let i = offset + 1;
		while (i < input.length) {
			const ch = input[i];
			if (!ch) break;
			if (isAlpha(ch) || isDigit(ch)) {
				i += 1;
				continue;
			}
			break;
		}
		return {
			kind: TokenKinds.Identifier,
			lexeme: input.slice(offset, i),
			offset,
		};
	});

	// Integers (for indexes/slices): -?[0-9]+
	scanner.register(TokenKinds.Number, (input, offset) => {
		let i = offset;
		if (input[i] === '-') i += 1;
		const startDigits = i;
		while (i < input.length && isDigit(input[i])) i += 1;
		if (i === startDigits) return null;
		return { kind: TokenKinds.Number, lexeme: input.slice(offset, i), offset };
	});

	// String literals: single or double quoted, with backslash escapes.
	// The parser is responsible for decoding escapes; lexer just captures the full lexeme.
	scanner.register(TokenKinds.String, (input, offset) => {
		const quote = input[offset];
		if (quote !== "'" && quote !== '"') return null;
		let i = offset + 1;
		while (i < input.length) {
			const ch = input[i]!;
			if (ch === '\\') {
				// Skip escaped character (or unicode escape body).
				i += 2;
				continue;
			}
			if (ch === quote) {
				i += 1;
				return {
					kind: TokenKinds.String,
					lexeme: input.slice(offset, i),
					offset,
				};
			}
			i += 1;
		}
		// Unterminated string. Return null so the scanner emits Unknown and the parser fails fast.
		return null;
	});
}
