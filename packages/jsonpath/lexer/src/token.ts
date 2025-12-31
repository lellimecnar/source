export const TokenKinds = {
	Unknown: 'Unknown',

	// Identifiers / literals (wired later)
	Identifier: 'Identifier',
	Number: 'Number',
	String: 'String',

	// Punctuation / operators
	Dollar: 'Dollar',
	At: 'At',
	DotDot: 'DotDot',
	Dot: 'Dot',
	LBracket: 'LBracket',
	RBracket: 'RBracket',
	Comma: 'Comma',
	Star: 'Star',
	Colon: 'Colon',
	LParen: 'LParen',
	RParen: 'RParen',
	Question: 'Question',
	Bang: 'Bang',
	EqEq: 'EqEq',
	NotEq: 'NotEq',
	LtEq: 'LtEq',
	GtEq: 'GtEq',
	Lt: 'Lt',
	Gt: 'Gt',
} as const;

export type TokenKind =
	| (typeof TokenKinds)[keyof typeof TokenKinds]
	| (string & {});

export interface Token {
	kind: TokenKind;
	lexeme: string;
	offset: number;
}
