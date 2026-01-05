import { describe, it } from 'vitest';
import { Lexer } from '../lexer.js';

describe('DebugLexer', () => {
	it('debug', () => {
		const input = '$[?(@.a + @.b == 15)]';
		const lexer = new Lexer(input);
		while (!lexer.isAtEnd()) {
			const token = lexer.next();
			console.log(`${token.type}: "${token.value}"`);
		}
	});
});
