export type TokenKind = string;

export type Token = {
	kind: TokenKind;
	lexeme: string;
	offset: number;
};
