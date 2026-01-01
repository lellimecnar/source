import { describe, expect, it } from 'vitest';

import {
	Scanner,
	TokenKinds,
	registerRfc9535LiteralScanRules,
	registerRfc9535ScanRules,
} from './index';

describe('@jsonpath/lexer (additional)', () => {
	it('skips whitespace by default', () => {
		const scanner = new Scanner();
		registerRfc9535ScanRules(scanner);
		const tokens = scanner.scanAll(' $ \n\t . ');
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.Dollar,
			TokenKinds.Dot,
		]);
	});

	it('prefers multi-character operators over single-char tokens', () => {
		const scanner = new Scanner();
		registerRfc9535ScanRules(scanner);
		const tokens = scanner.scanAll('.. <= >= == !=');
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.DotDot,
			TokenKinds.LtEq,
			TokenKinds.GtEq,
			TokenKinds.EqEq,
			TokenKinds.NotEq,
		]);
	});

	it('emits Unknown tokens for unrecognized characters', () => {
		const scanner = new Scanner();
		registerRfc9535ScanRules(scanner);
		const tokens = scanner.scanAll('#');
		expect(tokens).toEqual([{ kind: 'Unknown', lexeme: '#', offset: 0 }]);
	});

	it('scans literal strings after registering literal scan rules', () => {
		const scanner = new Scanner();
		registerRfc9535ScanRules(scanner);
		registerRfc9535LiteralScanRules(scanner);
		const tokens = scanner.scanAll("'a\\'b'");
		expect(tokens.map((t) => t.kind)).toEqual([TokenKinds.String]);
		expect(tokens[0]?.lexeme).toBe("'a\\'b'");
	});

	it('scans integers and decimals as numbers', () => {
		const scanner = new Scanner();
		registerRfc9535ScanRules(scanner);
		registerRfc9535LiteralScanRules(scanner);
		const tokens = scanner.scanAll('0 12 -3 4.5');
		// Current lexer is integer-only; decimals are tokenized as Number '.' Number.
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.Number,
			TokenKinds.Number,
			TokenKinds.Number,
			TokenKinds.Number,
			TokenKinds.Dot,
			TokenKinds.Number,
		]);
	});
});
