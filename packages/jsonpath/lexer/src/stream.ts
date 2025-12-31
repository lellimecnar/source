import type { Token } from './token';

export class TokenStream {
	private readonly tokens: readonly Token[];
	private index = 0;

	public constructor(tokens: readonly Token[]) {
		this.tokens = tokens;
	}

	public peek(): Token | undefined {
		return this.tokens[this.index];
	}

	public next(): Token | undefined {
		const t = this.tokens[this.index];
		if (t) this.index += 1;
		return t;
	}
}
