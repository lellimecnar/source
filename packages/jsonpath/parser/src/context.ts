import type { TokenStream } from '@jsonpath/lexer';

export type ParserContext = {
	input: string;
	tokens: TokenStream;
};
