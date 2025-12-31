<!-- markdownlint-disable-file -->
<!-- markdownlint-disable-file -->

# JSONPath RFC 9535 Compliance — PR D (C19–C25 Functions + Typing)

## Goal

Implement RFC 9535 function expressions + well-typedness validation and ship the required RFC function set (`length`, `count`, `match`, `search`, `value`) for `profile: 'rfc9535-full'`.

## Prerequisites

Make sure that the use is currently on the `jsonpath/rfc9535-pr-d` branch before beginning implementation.
If not, move them to the correct branch. If the branch does not exist, create it from master.

Hard constraints (PR‑D contract from the master plan):

- Functions MUST be parsed + type-validated + evaluated for `profile: 'rfc9535-full'`.
- Function syntax MUST be rejected for other profiles (at minimum: `rfc9535-core`).

### Verification Commands

Use workspace conventions (no `cd`):

```bash
pnpm --filter @jsonpath/ast test
pnpm --filter @jsonpath/plugin-syntax-root test
pnpm --filter @jsonpath/plugin-syntax-filter test
pnpm --filter @jsonpath/plugin-iregexp test
pnpm --filter @lellimecnar/jsonpath-conformance test
```

### Step-by-Step Instructions

#### Step 1: C19 — Add function-call AST + parse function expressions (rfc9535-full only)

- [ ] Add a dedicated filter function-call AST node and kind.
- [ ] Copy and paste code below into `packages/jsonpath/ast/src/nodes.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/ast/src/nodes.ts
@@
 export const FilterExprKinds = {
 	Or: 'FilterExpr:Or',
 	And: 'FilterExpr:And',
 	Not: 'FilterExpr:Not',
 	Compare: 'FilterExpr:Compare',
 	Literal: 'FilterExpr:Literal',
 	EmbeddedQuery: 'FilterExpr:EmbeddedQuery',
+	FunctionCall: 'FilterExpr:FunctionCall',
 } as const;
@@
 export type EmbeddedQueryNode = AstNodeBase<
 	(typeof FilterExprKinds)['EmbeddedQuery']
 > & {
 	scope: 'root' | 'current';
 	segments: SegmentNode[];
 	singular: boolean;
 };
+
+export type FilterFunctionCallNode = AstNodeBase<
+	(typeof FilterExprKinds)['FunctionCall']
+> & {
+	name: string;
+	args: FilterExprNode[];
+};
@@
 export type FilterExprNode =
 	| FilterOrNode
 	| FilterAndNode
 	| FilterNotNode
 	| FilterCompareNode
 	| FilterLiteralNode
 	| EmbeddedQueryNode
+	| FilterFunctionCallNode;
@@
 export function embeddedQuery(
 	scope: EmbeddedQueryNode['scope'],
 	segments: SegmentNode[],
 	singular = false,
 ): EmbeddedQueryNode {
 	return { kind: FilterExprKinds.EmbeddedQuery, scope, segments, singular };
 }
+
+export function filterFunctionCall(
+	name: string,
+	args: FilterExprNode[],
+): FilterFunctionCallNode {
+	return { kind: FilterExprKinds.FunctionCall, name, args };
+}
*** End Patch
```

- [ ] Parse function expressions only for `profile: 'rfc9535-full'` (reject in other profiles) and enforce the RFC identifier rule: lowercase alpha start, then `[a-z0-9_]*`.
- [ ] Copy and paste code below into `packages/jsonpath/plugin-syntax-root/src/parser.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-syntax-root/src/parser.ts
@@
 	filterAnd,
 	filterCompare,
 	filterLiteral,
 	filterNot,
 	filterOr,
 	filterSelector,
+	filterFunctionCall,
 	indexSelector,
 	nameSelector,
 	path,
 	segment,
 	sliceSelector,
 	wildcardSelector,
 } from '@jsonpath/ast';
@@
 function parseFilterPrimary(
 	ctx: ParserContext,
 	profile: Profile,
 	validateSingular = false,
 ): any {
 	const t = ctx.tokens.peek();
 	if (!t) syntaxError(ctx, ctx.input.length, 'Unexpected end of input');
@@
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
@@
 	syntaxError(ctx, t.offset, `Unexpected token in filter: ${t.kind}`);
 }

+type FunctionArgType = 'Value' | 'Nodes';
+type FunctionReturnType = 'Value' | 'Logical';
+
+const rfcFunctionSignatures: Record<
+	string,
+	{ args: readonly FunctionArgType[]; returns: FunctionReturnType }
+> = {
+	length: { args: ['Value'], returns: 'Value' },
+	count: { args: ['Nodes'], returns: 'Value' },
+	match: { args: ['Value', 'Value'], returns: 'Logical' },
+	search: { args: ['Value', 'Value'], returns: 'Logical' },
+	value: { args: ['Nodes'], returns: 'Value' },
+};
+
+function isValidRfcFunctionIdentifier(name: string): boolean {
+	return /^[a-z][a-z0-9_]*$/.test(name);
+}
+
+function parseFunctionArg(
+	ctx: ParserContext,
+	profile: Profile,
+	expected: FunctionArgType,
+): any {
+	const expr =
+		expected === 'Value'
+			? parseFilterPrimary(ctx, profile, true)
+			: parseFilterPrimary(ctx, profile, false);
+
+	if (expected === 'Nodes' && expr.kind !== 'FilterExpr:EmbeddedQuery') {
+		const off = ctx.tokens.peek()?.offset ?? ctx.input.length;
+		syntaxError(
+			ctx,
+			off,
+			'Not well-typed: expected a NodesType argument (an embedded query) for this function',
+		);
+	}
+
+	return expr;
+}
+
+function parseFunctionCall(
+	ctx: ParserContext,
+	profile: Profile,
+	name: string,
+	offset: number,
+): any {
+	// PR-D contract: functions are only enabled for rfc9535-full.
+	if (profile !== 'rfc9535-full') {
+		syntaxError(ctx, offset, 'Function expressions are not supported in this profile');
+	}
+
+	if (!isValidRfcFunctionIdentifier(name)) {
+		syntaxError(
+			ctx,
+			offset,
+			`Invalid function identifier (RFC 9535): ${name}`,
+		);
+	}
+
+	const sig = rfcFunctionSignatures[name];
+	if (!sig) {
+		syntaxError(ctx, offset, `Unknown RFC 9535 function: ${name}`);
+	}
+
+	expect(ctx, TokenKinds.LParen);
+	const args: any[] = [];
+
+	if (sig.args.length > 0) {
+		args.push(parseFunctionArg(ctx, profile, sig.args[0]!));
+		for (let i = 1; i < sig.args.length; i++) {
+			expect(ctx, TokenKinds.Comma);
+			args.push(parseFunctionArg(ctx, profile, sig.args[i]!));
+		}
+	}
+
+	// No extra args.
+	if (ctx.tokens.peek()?.kind === TokenKinds.Comma) {
+		syntaxError(ctx, ctx.tokens.peek()!.offset, `Too many arguments for ${name}()`);
+	}
+
+	expect(ctx, TokenKinds.RParen);
+	return filterFunctionCall(name, args);
+}
*** End Patch
```

- [ ] Add parser tests for function-call parsing (including nested calls) and identifier rejection.
- [ ] Copy and paste code below into `packages/jsonpath/plugin-syntax-root/src/index.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-syntax-root/src/index.spec.ts
@@
 	it('accepts singular queries in comparison operands', () => {
@@
 	});
+
+	it('parses RFC function calls in filters (rfc9535-full)', () => {
+		const engine = createEngine({
+			plugins: [createSyntaxRootPlugin()],
+			options: {
+				plugins: {
+					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
+				},
+			},
+		});
+		const ast = engine.parse("$[?length(@.authors) >= 5]");
+		const selector = (ast.segments[0] as any).selectors[0];
+		expect(selector.kind).toBe('Selector:Filter');
+		const compare = selector.expr;
+		expect(compare.kind).toBe('FilterExpr:Compare');
+		expect(compare.left.kind).toBe('FilterExpr:FunctionCall');
+		expect(compare.left.name).toBe('length');
+		expect(compare.left.args[0].kind).toBe('FilterExpr:EmbeddedQuery');
+	});
+
+	it('rejects invalid RFC function identifiers', () => {
+		const engine = createEngine({
+			plugins: [createSyntaxRootPlugin()],
+			options: {
+				plugins: {
+					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
+				},
+			},
+		});
+		expect(() => engine.parse('$[?Length(@)]')).toThrow(
+			'Invalid function identifier',
+		);
+	});
 });
*** End Patch
```

##### Step 1 Verification Checklist

- [x] `pnpm --filter @jsonpath/ast test`
- [x] `pnpm --filter @jsonpath/plugin-syntax-root test`

#### Step 1 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): parse RFC function expressions in filters (full only)

- Add FilterExpr:FunctionCall AST node and factory
- Parse RFC function calls in filter expressions for rfc9535-full
- Enforce RFC function identifier rule and arity

completes: PR-D step 1 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 2: C20 — Enforce well-typedness for functions + comparisons

- [x] Reject comparisons where either operand is a LogicalType (notably `match(...)` / `search(...)`).
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-root/src/parser.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-syntax-root/src/parser.ts
@@
 function parseFilterComparison(ctx: ParserContext, profile: Profile): any {
 	const left = parseFilterPrimary(ctx, profile, true);
 	const t = ctx.tokens.peek();
@@
 		ctx.tokens.next();
 		const operator = t.lexeme as any;
 		const right = parseFilterPrimary(ctx, profile, true);
+		// RFC well-typedness: comparisons require comparable ValueType operands.
+		if (left?.kind === 'FilterExpr:FunctionCall') {
+			if (left.name === 'match' || left.name === 'search') {
+				syntaxError(
+					ctx,
+					t.offset,
+					'Not well-typed: match()/search() return LogicalType and cannot be used in comparisons',
+				);
+			}
+		}
+		if (right?.kind === 'FilterExpr:FunctionCall') {
+			if (right.name === 'match' || right.name === 'search') {
+				syntaxError(
+					ctx,
+					t.offset,
+					'Not well-typed: match()/search() return LogicalType and cannot be used in comparisons',
+				);
+			}
+		}
 		return filterCompare(operator, left, right);
 	}
 	return left;
 }
*** End Patch
```

- [x] Add parse-time tests for the RFC examples mentioned in the plan.
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-root/src/index.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-syntax-root/src/index.spec.ts
@@
 	it('rejects invalid RFC function identifiers', () => {
@@
 	});
+
+	it('accepts length(@) as well-typed', () => {
+		const engine = createEngine({
+			plugins: [createSyntaxRootPlugin()],
+			options: {
+				plugins: {
+					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
+				},
+			},
+		});
+		expect(() => engine.parse('$[?length(@) == 1]')).not.toThrow();
+	});
+
+	it('rejects length(@.*) as not well-typed (ValueType requires singular query)', () => {
+		const engine = createEngine({
+			plugins: [createSyntaxRootPlugin()],
+			options: {
+				plugins: {
+					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
+				},
+			},
+		});
+		expect(() => engine.parse('$[?length(@.*) == 1]')).toThrow(
+			'Singular query in filter comparison',
+		);
+	});
+
+	it('rejects match(...) == true as not well-typed (LogicalType is not comparable)', () => {
+		const engine = createEngine({
+			plugins: [createSyntaxRootPlugin()],
+			options: {
+				plugins: {
+					'@jsonpath/plugin-syntax-root': { profile: 'rfc9535-full' },
+				},
+			},
+		});
+		expect(() =>
+			engine.parse("$[?match(@.date, '1974-05-..') == true]"),
+		).toThrow('Not well-typed: match()/search()');
+	});
 });
*** End Patch
```

##### Step 2 Verification Checklist

- [x] `pnpm --filter @jsonpath/plugin-syntax-root test`

#### Step 2 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): enforce RFC well-typedness for function expressions

- Reject match()/search() in comparisons (LogicalType is not comparable)
- Add parser tests for RFC well-typedness examples

completes: PR-D step 2 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 3: C21–C22 — Implement `length()` and `count()` evaluation

- [ ] Extend filter evaluation to support `FilterExpr:FunctionCall` and implement `length()` + `count()`.
- [ ] Copy and paste code below into `packages/jsonpath/plugin-syntax-filter/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-syntax-filter/src/index.ts
@@
 import { SelectorKinds, FilterExprKinds } from '@jsonpath/ast';
 import type { JsonPathPlugin, EvalContext } from '@jsonpath/core';
@@
 function isNothing(v: any): v is Nothing {
 	return v === Nothing;
 }
+
+function unicodeScalarLength(value: string): number {
+	let n = 0;
+	for (const _ of value) n++;
+	return n;
+}
+
+function evalValueExpr(
+	expr: any,
+	currentNode: any,
+	ctx: EvalContext,
+	evaluators: any,
+): any | Nothing {
+	switch (expr.kind) {
+		case FilterExprKinds.Literal:
+			return expr.value;
+
+		case FilterExprKinds.EmbeddedQuery:
+			// In ValueType contexts, embedded queries must behave like singular queries.
+			{
+				const results = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
+				if (results.length === 1) return results[0].value;
+				return Nothing;
+			}
+
+		case FilterExprKinds.FunctionCall:
+			return evalFunctionCall(expr, currentNode, ctx, evaluators);
+
+		default:
+			return Nothing;
+	}
+}
+
+function evalNodesExpr(
+	expr: any,
+	currentNode: any,
+	ctx: EvalContext,
+	evaluators: any,
+): any[] {
+	if (expr.kind !== FilterExprKinds.EmbeddedQuery) return [];
+	return evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
+}
+
+function evalFunctionCall(
+	call: any,
+	currentNode: any,
+	ctx: EvalContext,
+	evaluators: any,
+): any | Nothing {
+	switch (call.name) {
+		case 'length': {
+			const v = evalValueExpr(call.args[0], currentNode, ctx, evaluators);
+			if (isNothing(v)) return Nothing;
+			if (typeof v === 'string') return unicodeScalarLength(v);
+			if (Array.isArray(v)) return v.length;
+			if (typeof v === 'object' && v !== null) return Object.keys(v as any).length;
+			return Nothing;
+		}
+
+		case 'count': {
+			const nodes = evalNodesExpr(call.args[0], currentNode, ctx, evaluators);
+			return nodes.length;
+		}
+
+		default:
+			return Nothing;
+	}
+}
@@
 function evalFilterExpr(
 	expr: any,
 	currentNode: any,
 	ctx: EvalContext,
 	evaluators: any,
 ): boolean | Nothing {
 	switch (expr.kind) {
@@
 		case FilterExprKinds.EmbeddedQuery:
 			// Embedded query used directly as filter expression (existence test)
 			const result = evalEmbeddedQuery(expr, currentNode, ctx, evaluators);
 			return result.length > 0;
+
+		case FilterExprKinds.FunctionCall:
+			return evalFunctionCall(expr, currentNode, ctx, evaluators);
@@
 		default:
 			return Nothing;
 	}
 }
@@
 function evalComparable(
 	expr: any,
 	currentNode: any,
 	ctx: EvalContext,
 	evaluators: any,
 ): any | Nothing {
 	switch (expr.kind) {
 		case FilterExprKinds.Literal:
 			return expr.value;
@@
 		case FilterExprKinds.EmbeddedQuery:
@@
 			return Nothing;
+
+		case FilterExprKinds.FunctionCall:
+			return evalFunctionCall(expr, currentNode, ctx, evaluators);
@@
 		default:
 			return Nothing;
 	}
 }
*** End Patch
```

- [ ] Add conformance cases for `length()` and `count()` (profile: `rfc9535-full`).
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/corpus.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/conformance/src/corpus.ts
@@
 export const cases: ConformanceCase[] = [
@@
 	{
 		name: 'rfc: reject filter in core',
 		profile: 'rfc9535-core',
 		documentName: 'simple',
 		query: '$.xs[?@ > 1]',
 	},
+	{
+		name: 'rfc: length() over author string (full)',
+		profile: 'rfc9535-full',
+		documentName: 'rfc-bookstore-mini',
+		query: '$.store.book[*][?length(@.author) >= 12].author',
+		expect: {
+			values: ['Evelyn Waugh'],
+		},
+	},
+	{
+		name: 'rfc: count() over wildcard expansion (full)',
+		profile: 'rfc9535-full',
+		documentName: 'rfc-bookstore-mini',
+		query: '$.store.book[*][?count(@.*) == 4].title',
+		expect: {
+			values: ['Sayings', 'Sword'],
+		},
+	},
- [x] pnpm --filter @jsonpath/plugin-syntax-filter test
*** End Patch
```

- [ ] Add conformance spec assertions for the new full-profile cases.
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/index.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/conformance/src/index.spec.ts
@@
 	it('RFC 9535 (core): rejects filter syntax', () => {
@@
 	});
+
+	it('RFC 9535 (full): length() works in filters', () => {
+		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
+		const testCase = cases.find((c) => c.name === 'rfc: length() over author string (full)')!;
+		const out = runConformanceCase(engine, testCase);
+		expect(out).toEqual(testCase.expect?.values);
+	});
+
+	it('RFC 9535 (full): count() works in filters', () => {
+		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
+		const testCase = cases.find((c) => c.name === 'rfc: count() over wildcard expansion (full)')!;
+		const out = runConformanceCase(engine, testCase);
+		expect(out).toEqual(testCase.expect?.values);
+	});
- [x] pnpm --filter @lellimecnar/jsonpath-conformance test
*** End Patch
```

##### Step 3 Verification Checklist

- [ ] `pnpm --filter @jsonpath/plugin-syntax-filter test`
- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 3 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): implement length() and count() (rfc9535-full)

- Evaluate FilterExpr:FunctionCall in filter runtime
- Implement RFC length() and count() semantics
- Add conformance cases for length/count under rfc9535-full

completes: PR-D step 3 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 4: C23–C24 — Add I‑Regexp matcher API and implement `match()` / `search()`

- [x] Upgrade `@jsonpath/plugin-iregexp` to expose a minimal matcher API (`compile`, `matchesEntire`, `searches`).
- [x] Copy and paste code below into `packages/jsonpath/plugin-iregexp/src/iregexp.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-iregexp/src/iregexp.ts
@@
-export function matches(pattern: string, value: string): boolean {
-	try {
-		return new RegExp(pattern).test(value);
-	} catch {
-		return false;
-	}
-}
+export type CompiledIRegexp = {
+	pattern: string;
+	full: RegExp;
+	partial: RegExp;
+};
+
+export function compile(pattern: string): CompiledIRegexp | null {
+	try {
+		// NOTE: This is a pragmatic placeholder. Full RFC 9485 validation belongs here.
+		return {
+			pattern,
+			full: new RegExp(`^(?:${pattern})$`),
+			partial: new RegExp(pattern),
+		};
+	} catch {
+		return null;
+	}
+}
+
+export function matchesEntire(pattern: string, value: string): boolean {
+	const c = compile(pattern);
+	if (!c) return false;
+	return c.full.test(value);
+}
+
+export function searches(pattern: string, value: string): boolean {
+	const c = compile(pattern);
+	if (!c) return false;
+	return c.partial.test(value);
+}
*** End Patch
```

- [x] Update exports in `@jsonpath/plugin-iregexp`.
- [x] Copy and paste code below into `packages/jsonpath/plugin-iregexp/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-iregexp/src/index.ts
@@
 import type { JsonPathPlugin } from '@jsonpath/core';

-export { matches } from './iregexp';
+export { compile, matchesEntire, searches } from './iregexp';
@@
 export const plugin: JsonPathPlugin = {
 	meta: {
 		id: '@jsonpath/plugin-iregexp',
 		capabilities: ['regex:rfc9485:iregexp'],
 	},
 };
*** End Patch
```

- [x] Update unit tests for the new API.
- [x] Copy and paste code below into `packages/jsonpath/plugin-iregexp/src/index.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-iregexp/src/index.spec.ts
@@
 import { describe, expect, it } from 'vitest';

-import { matches, plugin } from './index';
+import { matchesEntire, searches, plugin } from './index';
@@
 describe('@jsonpath/plugin-iregexp', () => {
-	it('matches via RegExp', () => {
-		expect(matches('^a', 'abc')).toBe(true);
-		expect(matches('^a', 'xbc')).toBe(false);
-	});
+	it('matchesEntire anchors the pattern', () => {
+		expect(matchesEntire('a', 'a')).toBe(true);
+		expect(matchesEntire('a', 'xa')).toBe(false);
+	});
+
+	it('searches tests for substring matches', () => {
+		expect(searches('a', 'xa')).toBe(true);
+		expect(searches('a', 'bbb')).toBe(false);
+	});

 	it('returns false on invalid patterns', () => {
-		expect(matches('(', 'abc')).toBe(false);
+		expect(matchesEntire('(', 'abc')).toBe(false);
+		expect(searches('(', 'abc')).toBe(false);
 	});
*** End Patch
```

- [x] Implement `match()` and `search()` in filter evaluation (RFC behavior: non-string args => false; invalid pattern => false).
- [x] Copy and paste code below into `packages/jsonpath/plugin-syntax-filter/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-syntax-filter/src/index.ts
@@
 import { SelectorKinds, FilterExprKinds } from '@jsonpath/ast';
 import type { JsonPathPlugin, EvalContext } from '@jsonpath/core';
+import { compile } from '@jsonpath/plugin-iregexp';
@@
 const Nothing = Symbol('Nothing');
 type Nothing = typeof Nothing;
@@
+const compiledPatternCache = new Map<string, ReturnType<typeof compile>>();
+
+function getCompiled(pattern: string) {
+	if (compiledPatternCache.has(pattern)) return compiledPatternCache.get(pattern);
+	const c = compile(pattern);
+	compiledPatternCache.set(pattern, c);
+	return c;
+}
@@
 function evalFunctionCall(
 	call: any,
 	currentNode: any,
 	ctx: EvalContext,
 	evaluators: any,
 ): any | Nothing {
 	switch (call.name) {
@@
 		case 'count': {
 			const nodes = evalNodesExpr(call.args[0], currentNode, ctx, evaluators);
 			return nodes.length;
 		}
+
+		case 'match': {
+			const value = evalValueExpr(call.args[0], currentNode, ctx, evaluators);
+			const pattern = evalValueExpr(call.args[1], currentNode, ctx, evaluators);
+			if (typeof value !== 'string' || typeof pattern !== 'string') return false;
+			const c = getCompiled(pattern);
+			if (!c) return false;
+			return c.full.test(value);
+		}
+
+		case 'search': {
+			const value = evalValueExpr(call.args[0], currentNode, ctx, evaluators);
+			const pattern = evalValueExpr(call.args[1], currentNode, ctx, evaluators);
+			if (typeof value !== 'string' || typeof pattern !== 'string') return false;
+			const c = getCompiled(pattern);
+			if (!c) return false;
+			return c.partial.test(value);
+		}
@@
 		default:
 			return Nothing;
 	}
 }
*** End Patch
```

- [x] Add conformance corpus for `match()` vs `search()`.
- [x] Copy and paste code below into `packages/jsonpath/conformance/src/corpus.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/conformance/src/corpus.ts
@@
 export const documents: ConformanceDocument[] = [
@@
 	{
 		name: 'rfc-bookstore-mini',
 		json: {
@@
 		},
 	},
+	{
+		name: 'rfc-functions-mini',
+		json: {
+			items: [{ b: 'j' }, { b: 'k' }, { b: 'xj' }],
+		},
+	},
 ];
@@
 	{
 		name: 'rfc: count() over wildcard expansion (full)',
@@
 	},
+	{
+		name: 'rfc: match() vs search() (full)',
+		profile: 'rfc9535-full',
+		documentName: 'rfc-functions-mini',
+		query: "$.items[*][?search(@.b, '[jk]')].b",
+		expect: {
+			values: ['j', 'k', 'xj'],
+		},
+	},
+	{
+		name: 'rfc: match() anchors the full string (full)',
+		profile: 'rfc9535-full',
+		documentName: 'rfc-functions-mini',
+		query: "$.items[*][?match(@.b, '[jk]')].b",
+		expect: {
+			values: ['j', 'k'],
+		},
+	},

*** End Patch
```

- [x] Add conformance spec assertions.
- [x] Copy and paste code below into `packages/jsonpath/conformance/src/index.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/conformance/src/index.spec.ts
@@
 	it('RFC 9535 (full): count() works in filters', () => {
@@
 	});
+
+	it('RFC 9535 (full): search() finds substring matches', () => {
+		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
+		const testCase = cases.find((c) => c.name === 'rfc: match() vs search() (full)')!;
+		const out = runConformanceCase(engine, testCase);
+		expect(out).toEqual(testCase.expect?.values);
+	});
+
+	it('RFC 9535 (full): match() requires full-string match', () => {
+		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
+		const testCase = cases.find((c) => c.name === 'rfc: match() anchors the full string (full)')!;
+		const out = runConformanceCase(engine, testCase);
+		expect(out).toEqual(testCase.expect?.values);
+	});
### Step 3 STOP & COMMIT
*** End Patch
```

##### Step 4 Verification Checklist

- [x] `pnpm --filter @jsonpath/plugin-iregexp test`
- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 4 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): implement match/search using i-regexp matcher API

- Add compile + matchesEntire + searches API to @jsonpath/plugin-iregexp
- Implement match() and search() in filter runtime (invalid pattern => false)
- Add conformance cases for match/search

completes: PR-D step 4 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.

#### Step 5: C25 — Implement `value()`

- [ ] Implement `value(NodesType) -> ValueType` (empty/multi-node => Nothing) in filter runtime.
- [ ] Copy and paste code below into `packages/jsonpath/plugin-syntax-filter/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-syntax-filter/src/index.ts
@@
 function evalFunctionCall(
 	call: any,
 	currentNode: any,
 	ctx: EvalContext,
 	evaluators: any,
 ): any | Nothing {
 	switch (call.name) {
@@
 		case 'search': {
@@
 			return c.partial.test(value);
 		}
+
+		case 'value': {
+			const nodes = evalNodesExpr(call.args[0], currentNode, ctx, evaluators);
+			if (nodes.length === 1) return nodes[0].value;
+			return Nothing;
+		}
@@
 		default:
 			return Nothing;
 	}
 }
*** End Patch
```

- [ ] Add a conformance case that uses `value()` inside a comparison.
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/corpus.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/conformance/src/corpus.ts
@@
 	{
 		name: 'rfc: match() anchors the full string (full)',
@@
 	},
+	{
+		name: 'rfc: value() extracts singular node value (full)',
+		profile: 'rfc9535-full',
+		documentName: 'rfc-bookstore-mini',
+		query: '$.store.book[*][?value(@.price) >= 10].title',
+		expect: {
+			values: ['Sword'],
+		},
+	},

*** End Patch
```

- [ ] Add the conformance spec assertion.
- [ ] Copy and paste code below into `packages/jsonpath/conformance/src/index.spec.ts`:

````diff
*** Begin Patch
*** Update File: packages/jsonpath/conformance/src/index.spec.ts
@@
 	it('RFC 9535 (full): match() requires full-string match', () => {
@@
 	});
+
+	it('RFC 9535 (full): value() extracts singular node values', () => {
+		const engine = createRfc9535Engine({ profile: 'rfc9535-full' });
+		const testCase = cases.find((c) => c.name === 'rfc: value() extracts singular node value (full)')!;
+		const out = runConformanceCase(engine, testCase);
+		expect(out).toEqual(testCase.expect?.values);
+	});
```txt
*** End Patch
````

##### Step 5 Verification Checklist

- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 5 STOP & COMMIT

Multiline conventional commit message:

```txt
feat(jsonpath-rfc9535): implement value() (rfc9535-full)

- Add value(NodesType) -> ValueType behavior to filter runtime
- Add conformance case covering value() in comparisons

completes: PR-D step 5 of 5 for jsonpath-rfc9535
```

**STOP & COMMIT:** Agent must stop here and wait for the user to test, stage, and commit the change.
feat(jsonpath-rfc9535): add root eval context + filter existence semantics

- Thread EvalContext(root) through selector + segment evaluation
- Implement filter selector evaluation for existence tests

completes: jsonpath-rfc9535 PR-C step 3 (C17)

````

## ✓ COMPLETED

## Step 4 — C18: Comparisons + `Nothing` semantics

### Required semantics (minimum conformance slice)

Comparison operands may evaluate to:

- a JSON value
- `Nothing` (empty nodelist, or embedded query that does not resolve to exactly one node)

Truth table slice:

- `Nothing == Nothing` → true
- `Nothing != Nothing` → false
- `Nothing == <value>` → false
- `Nothing != <value>` → true

Ordering comparisons (`< <= > >=`):

- Only compare when both sides are the same primitive type where ordering is meaningful (numbers, strings). Otherwise false.

Files:

- packages/jsonpath/plugin-syntax-filter/src/index.ts

Implementation plan:

- `evalComparable()`:
  - literal → literal value
  - embedded singular query → resolve to exactly one node; else `Nothing`
- `compareValues(op, left, right)` implements the above semantics.

Conformance additions (rfc9535-full):

- [ ] numeric comparison: `$.xs[?@ > 1]`
- [ ] nothing/nothing equality: `$.xs[?$.absent1 == $.absent2]`
- [ ] null vs absent distinction:
  - `$.objs[?@.foo == null]` selects only objects where `foo` exists and is `null`
  - `$.objs[?!@.foo]` selects only objects where `foo` is absent

### Step 4 Verification

- [x] pnpm --filter @jsonpath/plugin-syntax-filter test
- [x] pnpm --filter @lellimecnar/jsonpath-conformance test

### Step 4 STOP & COMMIT

```txt
feat(jsonpath-rfc9535): implement filter comparisons + Nothing semantics

- Implement comparison evaluation in filters
- Add Nothing/empty-nodelist behavior for == and !=
- Add conformance coverage for comparisons and null-vs-absent behavior

completes: jsonpath-rfc9535 PR-C step 4 (C18)
````

✓ COMPLETED

---

## 🎉 ALL STEPS COMPLETE

PR C (C15–C18) fully implemented and tested.
