import { describe, expect, it } from 'vitest';

import { Scanner } from './scanner';
import { registerRfc9535LiteralScanRules } from './rfc9535-literals';
import { TokenKinds } from './token';

describe('@jsonpath/lexer rfc9535 literals', () => {
	it('scans identifiers', () => {
		const s = new Scanner();
		registerRfc9535LiteralScanRules(s);
		expect(s.scanAll('abc _x A1')).toEqual([
			{ kind: TokenKinds.Identifier, lexeme: 'abc', offset: 0 },
			{ kind: TokenKinds.Identifier, lexeme: '_x', offset: 4 },
			{ kind: TokenKinds.Identifier, lexeme: 'A1', offset: 7 },
		]);
	});

	it('scans integers', () => {
		const s = new Scanner();
		registerRfc9535LiteralScanRules(s);
		expect(s.scanAll('0 -1 42')).toEqual([
			{ kind: TokenKinds.Number, lexeme: '0', offset: 0 },
			{ kind: TokenKinds.Number, lexeme: '-1', offset: 2 },
			{ kind: TokenKinds.Number, lexeme: '42', offset: 5 },
		]);
	});

	it('scans string literals', () => {
		const s = new Scanner();
		registerRfc9535LiteralScanRules(s);
		const tokens = s.scanAll("'a' \"b\" 'j\\\\ j'");
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.String,
			TokenKinds.String,
			TokenKinds.String,
		]);
		expect(tokens.map((t) => t.lexeme)).toEqual(["'a'", '"b"', "'j\\\\ j'"]);
	});
});
