import type { Scanner } from './scanner';
import { TokenKinds } from './token';

export function registerRfc9535ScanRules(scanner: Scanner): void {
	// IMPORTANT: order matters for multi-character operators.
	scanner.register(TokenKinds.DotDot, (input, offset) =>
		input.startsWith('..', offset)
			? { lexeme: '..', offset, kind: TokenKinds.DotDot }
			: null,
	);
	scanner.register(TokenKinds.AndAnd, (input, offset) =>
		input.startsWith('&&', offset)
			? { lexeme: '&&', offset, kind: TokenKinds.AndAnd }
			: null,
	);
	scanner.register(TokenKinds.OrOr, (input, offset) =>
		input.startsWith('||', offset)
			? { lexeme: '||', offset, kind: TokenKinds.OrOr }
			: null,
	);
	scanner.register(TokenKinds.EqEq, (input, offset) =>
		input.startsWith('==', offset)
			? { lexeme: '==', offset, kind: TokenKinds.EqEq }
			: null,
	);
	scanner.register(TokenKinds.NotEq, (input, offset) =>
		input.startsWith('!=', offset)
			? { lexeme: '!=', offset, kind: TokenKinds.NotEq }
			: null,
	);
	scanner.register(TokenKinds.LtEq, (input, offset) =>
		input.startsWith('<=', offset)
			? { lexeme: '<=', offset, kind: TokenKinds.LtEq }
			: null,
	);
	scanner.register(TokenKinds.GtEq, (input, offset) =>
		input.startsWith('>=', offset)
			? { lexeme: '>=', offset, kind: TokenKinds.GtEq }
			: null,
	);

	const singles: [string, string][] = [
		['$', TokenKinds.Dollar],
		['@', TokenKinds.At],
		['.', TokenKinds.Dot],
		['[', TokenKinds.LBracket],
		[']', TokenKinds.RBracket],
		[',', TokenKinds.Comma],
		['*', TokenKinds.Star],
		[':', TokenKinds.Colon],
		['(', TokenKinds.LParen],
		[')', TokenKinds.RParen],
		['?', TokenKinds.Question],
		['!', TokenKinds.Bang],
		['<', TokenKinds.Lt],
		['>', TokenKinds.Gt],
	];

	for (const [lexeme, kind] of singles) {
		scanner.register(kind, (input, offset) =>
			input[offset] === lexeme ? { lexeme, offset, kind } : null,
		);
	}
}
