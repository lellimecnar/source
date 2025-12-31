import { describe, expect, it } from 'vitest';

import { Scanner } from './scanner';
import { TokenKinds } from './token';
import { registerRfc9535ScanRules } from './rfc9535';

describe('@jsonpath/lexer', () => {
	it('scans RFC punctuation rules with correct precedence', () => {
		const s = new Scanner();
		registerRfc9535ScanRules(s);
		const tokens = s.scanAll('$..a');
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.Dollar,
			TokenKinds.DotDot,
			TokenKinds.Unknown,
		]);
	});

	it('scans operators like == and >= as single tokens', () => {
		const s = new Scanner();
		registerRfc9535ScanRules(s);
		const tokens = s.scanAll('== >= <= !=');
		expect(tokens.map((t) => t.kind)).toEqual([
			TokenKinds.EqEq,
			TokenKinds.GtEq,
			TokenKinds.LtEq,
			TokenKinds.NotEq,
		]);
	});
});
