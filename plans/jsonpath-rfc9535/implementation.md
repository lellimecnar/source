<!-- markdownlint-disable-file -->

## JSONPath RFC 9535 Compliance — PR C (C15–C18 Filters)

## Scope

This is a copy/paste-ready implementation plan for **PR C** of RFC 9535 compliance:

- C15: Filter selector parsing + boolean operator precedence
- C16: Embedded queries in filters + singular-query restrictions (comparison operands)
- C17: Filter iteration semantics + existence tests
- C18: Comparisons + `Nothing` / empty-nodelist semantics

Hard constraints:

- Filters **MUST** be rejected for `profile: 'rfc9535-core'` with the existing message:
  - `Filter selectors are not supported in rfc9535-core`
- Filters **MUST** parse and evaluate for `profile: 'rfc9535-full'`.

## Repo Reality Check (what exists today)

- Lexer: packages/jsonpath/lexer/src/token.ts + packages/jsonpath/lexer/src/rfc9535.ts (no `&&`/`||` yet)
- Parser: packages/jsonpath/plugin-syntax-root/src/parser.ts rejects `[?`
- AST: packages/jsonpath/ast/src/nodes.ts has no filter selector/expr nodes
- Engine: packages/jsonpath/core/src/createEngine.ts calls selector evaluators as `(input, selector)` (no root context)
- Descendant: packages/jsonpath/plugin-syntax-descendant/src/index.ts calls selector evaluators as `(inputNode, selector)`
- Filter plugin: packages/jsonpath/plugin-syntax-filter/src/index.ts is metadata-only

## Verification Commands

Use workspace conventions (no `cd`):

```bash
pnpm --filter @jsonpath/lexer test
pnpm --filter @jsonpath/ast test
pnpm --filter @jsonpath/plugin-syntax-root test
pnpm --filter @jsonpath/core test
pnpm --filter @jsonpath/plugin-syntax-descendant test
pnpm --filter @jsonpath/plugin-syntax-filter test
pnpm --filter @lellimecnar/jsonpath-conformance test
```

---

## Step 1 — C15: Tokenize `&&`/`||`, add filter AST, parse filter selector + precedence

### 1A) Lexer: add `AndAnd` / `OrOr` token kinds

File: packages/jsonpath/lexer/src/token.ts

```diff
*** Begin Patch
*** Update File: packages/jsonpath/lexer/src/token.ts
@@
 export const TokenKinds = {
@@
 	Question: 'Question',
 	Bang: 'Bang',
+	AndAnd: 'AndAnd',
+	OrOr: 'OrOr',
 	EqEq: 'EqEq',
 	NotEq: 'NotEq',
 	LtEq: 'LtEq',
 	GtEq: 'GtEq',
 	Lt: 'Lt',
 	Gt: 'Gt',
 } as const;
*** End Patch
```

### 1B) Lexer: scan `&&` / `||`

File: packages/jsonpath/lexer/src/rfc9535.ts

```diff
*** Begin Patch
*** Update File: packages/jsonpath/lexer/src/rfc9535.ts
@@
 export function registerRfc9535ScanRules(scanner: Scanner): void {
 	// IMPORTANT: order matters for multi-character operators.
 	scanner.register(TokenKinds.DotDot, (input, offset) =>
 		input.startsWith('..', offset)
 			? { lexeme: '..', offset, kind: TokenKinds.DotDot }
 			: null,
 	);
+	scanner.register(TokenKinds.AndAnd, (input, offset) =>
+		input.startsWith('&&', offset)
+			? { lexeme: '&&', offset, kind: TokenKinds.AndAnd }
+			: null,
+	);
+	scanner.register(TokenKinds.OrOr, (input, offset) =>
+		input.startsWith('||', offset)
+			? { lexeme: '||', offset, kind: TokenKinds.OrOr }
+			: null,
+	);
 	scanner.register(TokenKinds.EqEq, (input, offset) =>
 		input.startsWith('==', offset)
 			? { lexeme: '==', offset, kind: TokenKinds.EqEq }
 			: null,
 	);
*** End Patch
```

### 1C) Lexer: tests for `&&` and `||`

File: packages/jsonpath/lexer/src/scanner.spec.ts

Add a test case near other operator tests:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/lexer/src/scanner.spec.ts
@@
 	it('scans operators like == and >= as single tokens', () => {
@@
 	});
+
+	it('scans boolean operators && and || as single tokens', () => {
+		const s = new Scanner();
+		registerRfc9535ScanRules(s);
+		const tokens = s.scanAll('&& ||');
+		expect(tokens.map((t) => t.kind)).toEqual([TokenKinds.AndAnd, TokenKinds.OrOr]);
+	});
 });
*** End Patch
```

### 1D) AST: add filter selector + filter expression nodes

File: packages/jsonpath/ast/src/nodes.ts

Implementation requirements:

- Add `SelectorKinds.Filter`
- Add filter expression node kinds with precedence support: `!` > comparisons > `&&` > `||`
- Add embedded query node usable inside filters (for C16+)

Minimal AST surface (suggested):

- `FilterSelectorNode { expr }`
- `FilterExprNode` union:
  - `FilterExpr:Or`, `FilterExpr:And`, `FilterExpr:Not`, `FilterExpr:Compare`, `FilterExpr:Literal`, `EmbeddedQuery`
- `EmbeddedQueryNode { scope: 'root' | 'current', segments, singular }`

### 1E) Parser: allow `[?` only for `rfc9535-full`, parse filter expressions

File: packages/jsonpath/plugin-syntax-root/src/parser.ts

Behavior requirements:

- Preserve existing `rfc9535-core` behavior:
  - throw `Filter selectors are not supported in rfc9535-core`
- For `rfc9535-full`, parse `[? <expr> ]` into `SelectorKinds.Filter`.
- Implement precedence:
  - `parseFilterOr` → `parseFilterAnd` → `parseFilterUnary` → `parseFilterComparison`
- Literals:
  - number, string, `true`/`false`/`null`
- Embedded queries in filter expressions (parsed now; evaluated later):
  - `@...` current scope
  - `$...` root scope

### Step 1 Verification

- [ ] pnpm --filter @jsonpath/lexer test
- [ ] pnpm --filter @jsonpath/ast test
- [ ] pnpm --filter @jsonpath/plugin-syntax-root test

### Step 1 STOP & COMMIT

```txt
feat(jsonpath-rfc9535): add filter tokens, AST, and filter parsing (full only)

- Add TokenKinds.AndAnd/OrOr and RFC scan rules
- Add filter selector/expression and embedded query AST nodes
- Parse filter selectors under rfc9535-full; keep rfc9535-core rejection message

completes: jsonpath-rfc9535 PR-C step 1 (C15)
```

STOP & COMMIT.

---

## Step 2 — C16: Embedded queries + singular-query restrictions for comparisons

Goal: comparison operands may be literals and/or **singular embedded queries**.

Singular query restrictions (enforced by parser when an embedded query is used in a comparison operand):

- No descendant segments (`..`)
- No unions (multiple selectors in one bracket)
- No wildcards (`*`)
- No slices (`:`)
- No filters (`[? ... ]`)

Files:

- packages/jsonpath/plugin-syntax-root/src/parser.ts

Acceptance tests (parser):

- [ ] reject `$.xs[?@.* == 1]` (wildcard)
- [ ] reject `$.xs[?@..a == 1]` (descendant)
- [ ] accept `$.xs[?@.a == 1]` and mark embedded operand `singular: true`

### Step 2 STOP & COMMIT

```txt
feat(jsonpath-rfc9535): enforce singular-query rules in filter comparisons

- Validate singular query restrictions for embedded queries used in comparisons
- Mark embedded comparison operands as singular

completes: jsonpath-rfc9535 PR-C step 2 (C16)
```

STOP & COMMIT.

---

## Step 3 — C17: Root eval context + filter existence semantics

### 3A) Thread root context through evaluation

Rationale: `$...` embedded queries inside filters require a root node.

Files:

- packages/jsonpath/core/src/runtime/hooks.ts
- packages/jsonpath/core/src/createEngine.ts
- packages/jsonpath/core/src/index.ts (export the context type)
- packages/jsonpath/plugin-syntax-descendant/src/index.ts (forward ctx)

Plan:

1. Add `export type EvalContext = { root: JsonPathNode }`.
2. Extend hook signatures:
   - `SelectorEvaluator(input, selector, ctx)`
   - `SegmentEvaluator(inputs, segment, evaluators, ctx)`
3. In engine evaluation:
   - `const root = rootNode(json)`
   - `const ctx = { root }`
   - pass `ctx` into selector+segment evaluation.
4. Update descendant evaluator to forward `ctx` when calling selector evaluators.

### 3B) Implement filter selector evaluation (existence)

File: packages/jsonpath/plugin-syntax-filter/src/index.ts

Behavior:

- Filter selector runs over each candidate node in the current nodelist.
- Evaluate the filter expression in the candidate’s scope (`@` points to the candidate).
- If expression is truthy, include the candidate.

Existence semantics:

- An embedded query used as a filter expression (not a comparison operand) is **true** iff it yields a non-empty nodelist.

### Step 3 Verification

- [ ] pnpm --filter @jsonpath/core test
- [ ] pnpm --filter @jsonpath/plugin-syntax-descendant test
- [ ] pnpm --filter @jsonpath/plugin-syntax-filter test
- [ ] pnpm --filter @lellimecnar/jsonpath-conformance test

### Step 3 STOP & COMMIT

```txt
feat(jsonpath-rfc9535): add root eval context + filter existence semantics

- Thread EvalContext(root) through selector + segment evaluation
- Implement filter selector evaluation for existence tests

completes: jsonpath-rfc9535 PR-C step 3 (C17)
```

STOP & COMMIT.

---

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

- [ ] pnpm --filter @jsonpath/plugin-syntax-filter test
- [ ] pnpm --filter @lellimecnar/jsonpath-conformance test

### Step 4 STOP & COMMIT

```txt
feat(jsonpath-rfc9535): implement filter comparisons + Nothing semantics

- Implement comparison evaluation in filters
- Add Nothing/empty-nodelist behavior for == and !=
- Add conformance coverage for comparisons and null-vs-absent behavior

completes: jsonpath-rfc9535 PR-C step 4 (C18)
```

STOP & COMMIT.
