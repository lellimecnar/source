import type { Token, TokenKind } from './token';

export type ScanRule = (input: string, offset: number) => Token | null;

export class Scanner {
	private readonly rules = new Map<TokenKind, ScanRule>();

	public register(kind: TokenKind, rule: ScanRule): void {
		this.rules.set(kind, rule);
	}

	public scanAll(input: string): Token[] {
		const tokens: Token[] = [];
		let offset = 0;
		while (offset < input.length) {
			let matched = false;
			// Skip whitespace by default
			const ch = input[offset];
			if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
				offset += 1;
				continue;
			}

			for (const [kind, rule] of this.rules.entries()) {
				const token = rule(input, offset); // gitleaks:allow
				if (token) {
					tokens.push({ ...token, kind });
					offset += token.lexeme.length;
					matched = true;
					break;
				}
			}

			if (!matched) {
				// Unknown character becomes a 1-char token.
				tokens.push({ kind: 'Unknown', lexeme: input[offset]!, offset });
				offset += 1;
			}
		}
		return tokens;
	}
}
