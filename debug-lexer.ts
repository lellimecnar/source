import { TokenType } from '@jsonpath/core/src/lexer.js';
import { Lexer } from '@jsonpath/lexer/src/lexer.js';

const input = '$[?(@.a + @.b == 15)]';
const lexer = new Lexer(input);

while (!lexer.isAtEnd()) {
	const token = lexer.next(); // gitleaks:allow
	console.log(`${token.type}: "${token.value}"`);
}
