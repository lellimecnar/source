import {
	descendantSegment,
	embeddedQuery,
	filterAnd,
	filterCompare,
	filterLiteral,
	filterNot,
	filterOr,
	filterSelector,
	filterFunctionCall,
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

function parseFilterOr(ctx: ParserContext, profile: Profile): any {
	let left = parseFilterAnd(ctx, profile);
	while (maybe(ctx, TokenKinds.OrOr)) {
		const right = parseFilterAnd(ctx, profile);
		left = filterOr(left, right);
	}
	return left;
}

function parseFilterAnd(ctx: ParserContext, profile: Profile): any {
	let left = parseFilterUnary(ctx, profile);
	while (maybe(ctx, TokenKinds.AndAnd)) {
		const right = parseFilterUnary(ctx, profile);
		left = filterAnd(left, right);
	}
	return left;
}

function parseFilterUnary(ctx: ParserContext, profile: Profile): any {
	if (maybe(ctx, TokenKinds.Bang)) {
		return filterNot(parseFilterUnary(ctx, profile));
	}
	return parseFilterComparison(ctx, profile);
}

function parseFilterComparison(ctx: ParserContext, profile: Profile): any {
	const left = parseFilterPrimary(ctx, profile, true);
	const t = ctx.tokens.peek();
	if (
		t &&
		(t.kind === TokenKinds.EqEq ||
			t.kind === TokenKinds.NotEq ||
			t.kind === TokenKinds.Lt ||
			t.kind === TokenKinds.Gt ||
			t.kind === TokenKinds.LtEq ||
			t.kind === TokenKinds.GtEq)
	) {
		ctx.tokens.next();
		const operator = t.lexeme as any;
		const right = parseFilterPrimary(ctx, profile, true);
		// RFC well-typedness: comparisons require comparable ValueType operands.
		if (left?.kind === 'FilterExpr:FunctionCall') {
			if (left.name === 'match' || left.name === 'search') {
				syntaxError(
					ctx,
					t.offset,
					'Not well-typed: match()/search() return LogicalType and cannot be used in comparisons',
				);
			}
		}
		if (right?.kind === 'FilterExpr:FunctionCall') {
			if (right.name === 'match' || right.name === 'search') {
				syntaxError(
					ctx,
					t.offset,
					'Not well-typed: match()/search() return LogicalType and cannot be used in comparisons',
				);
			}
		}
		return filterCompare(operator, left, right);
	}
	return left;
}

function parseFilterPrimary(
	ctx: ParserContext,
	profile: Profile,
	validateSingular = false,
): any {
	const t = ctx.tokens.peek();
	if (!t) syntaxError(ctx, ctx.input.length, 'Unexpected end of input');

	if (t.kind === TokenKinds.LParen) {
		ctx.tokens.next();
		const expr = parseFilterOr(ctx, profile);
		expect(ctx, TokenKinds.RParen);
		return expr;
	}

	if (t.kind === TokenKinds.String) {
		const tok = ctx.tokens.next()!;
		return filterLiteral(decodeQuotedString(tok.lexeme));
	}

	if (t.kind === TokenKinds.Number) {
		const tok = ctx.tokens.next()!;
		return filterLiteral(Number(tok.lexeme));
	}

	if (t.kind === TokenKinds.Identifier) {
		const tok = ctx.tokens.next()!;
		if (tok.lexeme === 'true') return filterLiteral(true);
		if (tok.lexeme === 'false') return filterLiteral(false);
		if (tok.lexeme === 'null') return filterLiteral(null);

		const next = ctx.tokens.peek();
		if (next?.kind === TokenKinds.LParen) {
			return parseFunctionCall(ctx, profile, tok.lexeme, tok.offset);
		}

		syntaxError(
			ctx,
			tok.offset,
			`Unexpected identifier in filter: ${tok.lexeme}`,
		);
	}

	if (t.kind === TokenKinds.Dollar || t.kind === TokenKinds.At) {
		return parseEmbeddedQuery(ctx, profile, validateSingular);
	}

	syntaxError(ctx, t.offset, `Unexpected token in filter: ${t.kind}`);
}

type FunctionArgType = 'Value' | 'Nodes';
type FunctionReturnType = 'Value' | 'Logical';

const rfcFunctionSignatures: Record<
	string,
	{ args: readonly FunctionArgType[]; returns: FunctionReturnType }
> = {
	length: { args: ['Value'], returns: 'Value' },
	count: { args: ['Nodes'], returns: 'Value' },
	match: { args: ['Value', 'Value'], returns: 'Logical' },
	search: { args: ['Value', 'Value'], returns: 'Logical' },
	value: { args: ['Nodes'], returns: 'Value' },
};

function isValidRfcFunctionIdentifier(name: string): boolean {
	return /^[a-z][a-z0-9_]*$/.test(name);
}

function parseFunctionArg(
	ctx: ParserContext,
	profile: Profile,
	expected: FunctionArgType,
): any {
	const expr =
		expected === 'Value'
			? parseFilterPrimary(ctx, profile, true)
			: parseFilterPrimary(ctx, profile, false);

	if (expected === 'Nodes' && expr.kind !== 'FilterExpr:EmbeddedQuery') {
		const off = ctx.tokens.peek()?.offset ?? ctx.input.length;
		syntaxError(
			ctx,
			off,
			'Not well-typed: expected a NodesType argument (an embedded query) for this function',
		);
	}

	return expr;
}

function parseFunctionCall(
	ctx: ParserContext,
	profile: Profile,
	name: string,
	offset: number,
): any {
	// PR-D contract: functions are only enabled for rfc9535-full.
	if (profile !== 'rfc9535-full') {
		syntaxError(
			ctx,
			offset,
			'Function expressions are not supported in this profile',
		);
	}

	if (!isValidRfcFunctionIdentifier(name)) {
		syntaxError(ctx, offset, `Invalid function identifier (RFC 9535): ${name}`);
	}

	const sig = rfcFunctionSignatures[name];
	if (!sig) {
		syntaxError(ctx, offset, `Unknown RFC 9535 function: ${name}`);
	}

	expect(ctx, TokenKinds.LParen);
	const args: any[] = [];

	if (sig.args.length > 0) {
		args.push(parseFunctionArg(ctx, profile, sig.args[0]!));
		for (let i = 1; i < sig.args.length; i++) {
			expect(ctx, TokenKinds.Comma);
			args.push(parseFunctionArg(ctx, profile, sig.args[i]!));
		}
	}

	// No extra args.
	if (ctx.tokens.peek()?.kind === TokenKinds.Comma) {
		syntaxError(
			ctx,
			ctx.tokens.peek()!.offset,
			`Too many arguments for ${name}()`,
		);
	}

	expect(ctx, TokenKinds.RParen);
	return filterFunctionCall(name, args);
}

function isSingularQuery(segments: any[]): boolean {
	for (const seg of segments) {
		// No descendant segments
		if (seg.kind === 'DescendantSegment') return false;

		// Check selectors within this segment
		const selectors = seg.selectors || [];
		if (selectors.length > 1) return false; // No unions

		for (const sel of selectors) {
			// No filters
			if (sel.kind === 'Selector:Filter') return false;
			// No wildcards
			if (sel.kind === 'Selector:Wildcard') return false;
			// No slices
			if (sel.kind === 'Selector:Slice') return false;
		}
	}
	return true;
}

function validateSingularQuery(
	ctx: ParserContext,
	offset: number,
	segments: any[],
): void {
	if (!isSingularQuery(segments)) {
		syntaxError(
			ctx,
			offset,
			'Singular query in filter comparison must not use: descendant (..), unions, wildcards (*), slices (:), or filters (?)',
		);
	}
}

function parseEmbeddedQuery(
	ctx: ParserContext,
	profile: Profile,
	validateSingular = false,
): any {
	const t = ctx.tokens.next()!;
	const scope = t.kind === TokenKinds.Dollar ? 'root' : 'current';
	const segments = parseSegments(ctx, profile);

	if (validateSingular) {
		validateSingularQuery(ctx, t.offset, segments);
	}

	return embeddedQuery(scope, segments, validateSingular);
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
		const expr = parseFilterOr(ctx, profile);
		expect(ctx, TokenKinds.RBracket);
		return { selectors: [filterSelector(expr)] };
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

function parseSegments(ctx: ParserContext, profile: Profile): any[] {
	const segments: any[] = [];
	while (true) {
		const t = ctx.tokens.peek();
		if (!t) break;

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

		break;
	}
	return segments;
}

export function parseRfc9535Path(ctx: ParserContext, profile: Profile) {
	expect(ctx, TokenKinds.Dollar);
	return path(parseSegments(ctx, profile));
}
