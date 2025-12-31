import {
	descendantSegment,
	indexSelector,
	nameSelector,
	path,
	segment,
	sliceSelector,
	wildcardSelector,
} from '@jsonpath/ast';
import { JsonPathError, JsonPathErrorCodes } from '@jsonpath/core';
import { TokenKinds } from '@jsonpath/lexer';
import type { ParserContext } from '@jsonpath/parser';

type Profile = 'rfc9535-draft' | 'rfc9535-core' | 'rfc9535-full';

function syntaxError(
	ctx: ParserContext,
	offset: number,
	message: string,
): never {
	throw new JsonPathError({
		code: JsonPathErrorCodes.Syntax,
		message,
		expression: ctx.input,
		location: { offset },
	});
}

function decodeQuotedString(lexeme: string): string {
	// Lexer includes the surrounding quote characters.
	const quote = lexeme[0];
	const raw = lexeme.slice(1, lexeme.endsWith(quote) ? -1 : undefined);
	// Minimal decoding: \\ and escaped quotes.
	return raw
		.replaceAll('\\\\', '\\')
		.replaceAll("\\'", "'")
		.replaceAll('\\"', '"');
}

function parseInteger(
	ctx: ParserContext,
	lexeme: string,
	offset: number,
): number {
	const n = Number.parseInt(lexeme, 10);
	if (!Number.isFinite(n))
		syntaxError(ctx, offset, `Invalid integer: ${lexeme}`);
	return n;
}

function expect(
	ctx: ParserContext,
	kind: string,
): { kind: string; lexeme: string; offset: number } {
	const t = ctx.tokens.next();
	if (!t || t.kind !== kind) {
		const off = t?.offset ?? ctx.input.length;
		syntaxError(ctx, off, `Expected token ${kind}`);
	}
	return t;
}

function maybe(
	ctx: ParserContext,
	kind: string,
): { kind: string; lexeme: string; offset: number } | null {
	const t = ctx.tokens.peek();
	if (!t || t.kind !== kind) return null;
	return ctx.tokens.next()!;
}

function parseSelector(
	ctx: ParserContext,
):
	| ReturnType<typeof nameSelector>
	| ReturnType<typeof wildcardSelector>
	| ReturnType<typeof indexSelector>
	| ReturnType<typeof sliceSelector> {
	const t = ctx.tokens.peek();
	if (!t) syntaxError(ctx, ctx.input.length, 'Unexpected end of input');

	if (t.kind === TokenKinds.Star) {
		ctx.tokens.next();
		return wildcardSelector();
	}

	if (t.kind === TokenKinds.String) {
		const tok = ctx.tokens.next()!;
		return nameSelector(decodeQuotedString(tok.lexeme));
	}

	// Slice: [start?:end?:step?] (only inside brackets)
	// We detect slice when the next token is ':' OR when number is followed by ':'.
	if (t.kind === TokenKinds.Colon) {
		ctx.tokens.next();
		const endTok = maybe(ctx, TokenKinds.Number);
		let end: number | undefined;
		if (endTok) end = parseInteger(ctx, endTok.lexeme, endTok.offset);

		let step: number | undefined;
		if (maybe(ctx, TokenKinds.Colon)) {
			const stepTok = maybe(ctx, TokenKinds.Number);
			if (stepTok) step = parseInteger(ctx, stepTok.lexeme, stepTok.offset);
		}

		return sliceSelector({ start: undefined, end, step });
	}

	if (t.kind === TokenKinds.Number) {
		const first = ctx.tokens.next()!;
		const start = parseInteger(ctx, first.lexeme, first.offset);
		if (maybe(ctx, TokenKinds.Colon)) {
			const endTok = maybe(ctx, TokenKinds.Number);
			let end: number | undefined;
			if (endTok) end = parseInteger(ctx, endTok.lexeme, endTok.offset);

			let step: number | undefined;
			if (maybe(ctx, TokenKinds.Colon)) {
				const stepTok = maybe(ctx, TokenKinds.Number);
				if (stepTok) step = parseInteger(ctx, stepTok.lexeme, stepTok.offset);
			}

			return sliceSelector({ start, end, step });
		}
		return indexSelector(start);
	}

	syntaxError(ctx, t.offset, `Unexpected selector token: ${t.kind}`); // gitleaks:allow
}

function parseBracketSelectors(
	ctx: ParserContext,
	profile: Profile,
): { selectors: any[] } {
	expect(ctx, TokenKinds.LBracket);

	// Reject filters in rfc9535-core (and keep PR B focused).
	const maybeFilter = maybe(ctx, TokenKinds.Question);
	if (maybeFilter) {
		if (profile === 'rfc9535-core') {
			syntaxError(
				ctx,
				maybeFilter.offset,
				'Filter selectors are not supported in rfc9535-core',
			);
		}
		syntaxError(
			ctx,
			maybeFilter.offset,
			'Filter selectors are not implemented yet',
		);
	}

	const selectors: any[] = [];
	selectors.push(parseSelector(ctx));
	while (maybe(ctx, TokenKinds.Comma)) {
		selectors.push(parseSelector(ctx));
	}
	expect(ctx, TokenKinds.RBracket);
	return { selectors };
}

function parseDotName(ctx: ParserContext): any {
	const id = expect(ctx, TokenKinds.Identifier);
	return nameSelector(id.lexeme);
}

export function parseRfc9535Path(ctx: ParserContext, profile: Profile) {
	const first = expect(ctx, TokenKinds.Dollar);
	void first;

	const segments: any[] = [];
	while (ctx.tokens.peek()) {
		const t = ctx.tokens.peek()!;
		if (t.kind === TokenKinds.Dot) {
			ctx.tokens.next();
			const next = ctx.tokens.peek();
			if (!next)
				syntaxError(ctx, ctx.input.length, 'Expected selector after .');
			if (next.kind === TokenKinds.Star) {
				ctx.tokens.next();
				segments.push(segment([wildcardSelector()]));
				continue;
			}
			segments.push(segment([parseDotName(ctx)]));
			continue;
		}

		if (t.kind === TokenKinds.DotDot) {
			ctx.tokens.next();
			const next = ctx.tokens.peek();
			if (!next)
				syntaxError(ctx, ctx.input.length, 'Expected selector after ..');
			if (next.kind === TokenKinds.Star) {
				ctx.tokens.next();
				segments.push(descendantSegment([wildcardSelector()]));
				continue;
			}
			if (next.kind === TokenKinds.Identifier) {
				segments.push(descendantSegment([parseDotName(ctx)]));
				continue;
			}
			if (next.kind === TokenKinds.LBracket) {
				const { selectors } = parseBracketSelectors(ctx, profile);
				segments.push(descendantSegment(selectors));
				continue;
			}
			syntaxError(ctx, next.offset, 'Unexpected token after ..');
		}

		if (t.kind === TokenKinds.LBracket) {
			const { selectors } = parseBracketSelectors(ctx, profile);
			segments.push(segment(selectors));
			continue;
		}

		syntaxError(ctx, t.offset, `Unexpected token in path: ${t.kind}`);
	}

	return path(segments);
}
