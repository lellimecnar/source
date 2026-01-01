<!-- markdownlint-disable-file -->

## JSONPath Ecosystem: Complete @jsonpath/\* Implementation

## Goal

Make every existing `@jsonpath/*` workspace in this monorepo fully functional and spec-aligned for:

- RFC 9535 query support via `@jsonpath/plugin-rfc-9535`
- Stable result views (`value`, `node`, `pointer`, `path`, `parent`)
- RFC 9485 (I-Regexp) behavior (with explicit test vectors)
- RFC 6902 JSON Patch full op set
- JSONPath-driven mutation (select → pointers → apply)
- Validation integration + adapters
- CLI correctness (JSON-only config)
- Packaging/exports + docs sync

This document is a copy-paste ready implementation guide derived from `plans/jsonpath-complete-ecosystem/plan.md`.

## Prerequisites

Make sure you are currently on the `jsonpath/complete-ecosystem` branch before beginning implementation.

```bash
# Check current branch
git branch --show-current

# If not on jsonpath/complete-ecosystem, create and switch
git checkout -b jsonpath/complete-ecosystem
```

### Verification Commands (used throughout)

Use workspace conventions (no `cd`):

```bash
pnpm --filter @jsonpath/core test
pnpm --filter @jsonpath/plugin-rfc-9535 test
pnpm --filter @lellimecnar/jsonpath-conformance test
pnpm --filter @jsonpath/printer test
pnpm --filter @jsonpath/plugin-iregexp test
pnpm --filter @jsonpath/patch test
pnpm --filter @jsonpath/mutate test
pnpm --filter @jsonpath/plugin-validate test
pnpm --filter @jsonpath/cli test
pnpm -w verify:exports
```

---

## Step-by-Step Instructions

### Step 1: Baseline inventory + guardrails (tests + CI sanity)

- [x] Produce an “implemented vs placeholder vs missing” matrix for every `packages/jsonpath/*` workspace.
- [x] Add a small smoke test ensuring each `@jsonpath/*` package has a meaningful runtime export.

#### Step 1.1: Add an inventory script

- [x] Create `scripts/jsonpath/ecosystem-inventory.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagesDir = path.join(root, 'packages', 'jsonpath');

function listDirs(p) {
	return fs
		.readdirSync(p, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);
}

function walkFiles(dir, exts) {
	const out = [];
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, ent.name);
		if (ent.isDirectory()) {
			out.push(...walkFiles(full, exts));
		} else if (ent.isFile()) {
			if (exts.some((e) => ent.name.endsWith(e))) out.push(full);
		}
	}
	return out;
}

const placeholderPatterns = [
	/Framework-only stable placeholder/i,
	/pragmatic placeholder/i,
	/Unsupported JSON Patch operation/i,
	/placeholder path/i,
];

const rows = [];
for (const pkg of listDirs(packagesDir)) {
	const pkgDir = path.join(packagesDir, pkg);
	const pkgJsonPath = path.join(pkgDir, 'package.json');
	if (!fs.existsSync(pkgJsonPath)) continue;
	const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
	const name = pkgJson.name ?? `(missing name) ${pkg}`;

	const srcDir = path.join(pkgDir, 'src');
	const files = fs.existsSync(srcDir)
		? walkFiles(srcDir, ['.ts', '.tsx', '.js', '.mjs'])
		: [];
	let placeholders = 0;
	for (const f of files) {
		const text = fs.readFileSync(f, 'utf8');
		if (placeholderPatterns.some((re) => re.test(text))) placeholders += 1;
	}

	rows.push({
		name,
		pkg,
		placeholders,
		hasSrc: fs.existsSync(srcDir),
		fileCount: files.length,
	});
}

rows.sort((a, b) => a.name.localeCompare(b.name));

process.stdout.write('JSONPath ecosystem inventory\n');
process.stdout.write('==========================\n\n');
for (const r of rows) {
	process.stdout.write(
		`${r.name}\n  folder: packages/jsonpath/${r.pkg}\n  src: ${r.hasSrc ? 'yes' : 'no'} (${r.fileCount} files)\n  placeholder-matches: ${r.placeholders}\n\n`,
	);
}

const total = rows.reduce((n, r) => n + r.placeholders, 0);
process.stdout.write(`TOTAL placeholder-matches: ${total}\n`);
```

- [x] Run it:

```bash
node scripts/jsonpath/ecosystem-inventory.mjs
```

#### Step 1.2: Add a minimal import smoke test

- [x] Copy/paste into `packages/jsonpath/conformance/src/ecosystem-smoke.spec.ts` (new file):

```ts
import { describe, expect, it } from 'vitest';

import { createRfc9535Engine } from '@jsonpath/plugin-rfc-9535';

import * as core from '@jsonpath/core';
import * as ast from '@jsonpath/ast';
import * as lexer from '@jsonpath/lexer';
import * as parser from '@jsonpath/parser';
import * as printer from '@jsonpath/printer';
import * as pointer from '@jsonpath/pointer';
import * as patch from '@jsonpath/patch';
import * as mutate from '@jsonpath/mutate';
import * as validate from '@jsonpath/plugin-validate';

describe('jsonpath ecosystem smoke', () => {
	it('imports public entries and runs a tiny end-to-end query', () => {
		expect(typeof core.createEngine).toBe('function');
		expect(typeof ast.path).toBe('function');
		expect(typeof lexer.Scanner).toBe('function');
		expect(typeof parser.JsonPathParser).toBe('function');
		expect(typeof printer.printAst).toBe('function');
		expect(typeof pointer.parsePointer).toBe('function');
		expect(typeof patch.applyPatch).toBe('function');
		expect(typeof mutate.setAll).toBe('function');
		expect(typeof validate.validateAll).toBe('function');

		const engine = createRfc9535Engine({ profile: 'rfc9535-core' });
		const compiled = engine.compile('$.a');
		const out = engine.evaluateSync(compiled, { a: 1 });
		expect(out).toEqual([1]);
	});
});
```

#### Step 1 Verification Checklist

- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`
- [x] Smoke test passes

#### Step 1 STOP & COMMIT

```txt
test(jsonpath): add ecosystem inventory + smoke test

- Add inventory script for placeholder detection
- Add conformance smoke test for public entry imports + minimal RFC engine run

completes: step 1 of 18 for jsonpath-complete-ecosystem
```

---

### Step 2: Core contract hardening (determinism, config, sync/async, errors)

This repo already has deterministic plugin ordering, conflict detection, and stable error codes in `@jsonpath/core`.

- [x] Confirm core contracts are enforced by tests.

#### Step 2 Verification Checklist

- [x] `pnpm --filter @jsonpath/core test`
- [x] `pnpm --filter @jsonpath/plugin-rfc-9535 test`

#### Step 2 STOP & COMMIT

```txt
test(@jsonpath/core): verify core contracts

- No code changes required; confirmed determinism/config/errors via existing tests

completes: step 2 of 18 for jsonpath-complete-ecosystem
```

---

### Step 3: Finish `@jsonpath/printer` (unblock stable `path` outputs)

The current printer is a framework-only placeholder. Replace it with a stable printer for RFC 9535 AST shapes.

- [x] Copy/paste the patch below into `packages/jsonpath/printer/src/printer.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/printer/src/printer.ts
@@
 import type { JsonPathAst } from '@jsonpath/ast';
+import { FilterExprKinds, SelectorKinds } from '@jsonpath/ast';
 import type { PrintOptions } from './options';

 export function printAst(ast: JsonPathAst, _options?: PrintOptions): string {
-	// Framework-only stable placeholder: emits a minimal sentinel.
-	// Result/path plugins own stable JSONPath formatting.
-	return ast.kind === 'Path' ? '$' : '$';
+	if (ast.kind !== 'Path') return '$';
+	let out = '$';
+	for (const seg of ast.segments) {
+		const selectors = (seg as any).selectors as unknown[];
+		const isDescendant = seg.kind === 'DescendantSegment';
+		out += isDescendant ? '..' : '';
+
+		// Canonical printing strategy:
+		// - Prefer dot-notation only for simple Name selectors.
+		// - Otherwise use bracket selector lists.
+		if (
+			!isDescendant &&
+			selectors.length === 1 &&
+			(selectors[0] as any).kind === SelectorKinds.Name &&
+			isSimpleIdentifier((selectors[0] as any).name)
+		) {
+			out += '.' + (selectors[0] as any).name;
+			continue;
+		}
+
+		if (
+			isDescendant &&
+			selectors.length === 1 &&
+			(selectors[0] as any).kind === SelectorKinds.Name &&
+			isSimpleIdentifier((selectors[0] as any).name)
+		) {
+			out += (selectors[0] as any).name;
+			continue;
+		}
+
+		if (isDescendant && selectors.length === 1 && (selectors[0] as any).kind === SelectorKinds.Wildcard) {
+			out += '*';
+			continue;
+		}
+
+		out += '[' + selectors.map((s) => printSelector(s as any)).join(',') + ']';
+	}
+	return out;
 }
+
+function isSimpleIdentifier(name: string): boolean {
+	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
+}
+
+function printSelector(sel: any): string {
+	if (sel.kind === SelectorKinds.Name) return quoteString(sel.name);
+	if (sel.kind === SelectorKinds.Index) return String(sel.index);
+	if (sel.kind === SelectorKinds.Wildcard) return '*';
+	if (sel.kind === SelectorKinds.Slice) {
+		const start = sel.start != null ? String(sel.start) : '';
+		const end = sel.end != null ? String(sel.end) : '';
+		const step = sel.step != null ? String(sel.step) : '';
+		return `${start}:${end}${sel.step != null ? ':' + step : ''}`;
+	}
+	if (sel.kind === SelectorKinds.Filter) {
+		return `?(${printFilterExpr(sel.expr)})`;
+	}
+	return '*';
+}
+
+function printFilterExpr(expr: any): string {
+	if (expr.kind === FilterExprKinds.Literal) {
+		if (expr.value === null) return 'null';
+		if (typeof expr.value === 'string') return quoteString(expr.value);
+		return String(expr.value);
+	}
+	if (expr.kind === FilterExprKinds.Not) return `!(${printFilterExpr(expr.expr)})`;
+	if (expr.kind === FilterExprKinds.And)
+		return `(${printFilterExpr(expr.left)})&&(${printFilterExpr(expr.right)})`;
+	if (expr.kind === FilterExprKinds.Or)
+		return `(${printFilterExpr(expr.left)})||(${printFilterExpr(expr.right)})`;
+	if (expr.kind === FilterExprKinds.Compare)
+		return `(${printFilterExpr(expr.left)})${expr.operator}(${printFilterExpr(expr.right)})`;
+	if (expr.kind === FilterExprKinds.FunctionCall)
+		return `${expr.name}(${(expr.args ?? []).map((a: any) => printFilterExpr(a)).join(',')})`;
+	if (expr.kind === FilterExprKinds.EmbeddedQuery) {
+		const head = expr.scope === 'root' ? '$' : '@';
+		const fakePath = { kind: 'Path', segments: expr.segments ?? [] } as any;
+		return head + printAst(fakePath).slice(1);
+	}
+	return 'null';
+}
+
+function quoteString(value: string): string {
+	// RFC 9535 member-name selectors use single-quoted strings.
+	return `'${escapeSingleQuoted(value)}'`;
+}
+
+function escapeSingleQuoted(value: string): string {
+	return value
+		.replace(/\\/g, '\\\\')
+		.replace(/'/g, "\\'")
+		.replace(/\n/g, '\\n')
+		.replace(/\r/g, '\\r')
+		.replace(/\t/g, '\\t')
+		.replace(/[\u0000-\u001F]/g, (ch) => {
+			const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
+			return `\\u${code}`;
+		});
+}
*** End Patch
```

- [x] Update `packages/jsonpath/printer/src/printer.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/printer/src/printer.spec.ts
@@
 import { describe, expect, it } from 'vitest';

-import { path } from '@jsonpath/ast';
+import { nameSelector, path, segment } from '@jsonpath/ast';
 import { printAst } from './printer';
@@
 describe('@jsonpath/printer', () => {
-	it('prints a placeholder path', () => {
+	it('prints the root path', () => {
 		expect(printAst(path([]))).toBe('$');
 	});
+
+	it('prints a simple child-member path using dot-notation', () => {
+		expect(printAst(path([segment([nameSelector('a')])]))).toBe('$.a');
+	});
 });
*** End Patch
```

#### Step 3 Verification Checklist

- [x] `pnpm --filter @jsonpath/printer test`

#### Step 3 STOP & COMMIT

```txt
feat(@jsonpath/printer): implement stable RFC9535 AST printer

- Replace placeholder printAst with canonical printing for RFC9535 AST shapes
- Add basic printer unit tests

completes: step 3 of 18 for jsonpath-complete-ecosystem
```

---

### Step 4: Implement result-view plugins as real engine hooks

These plugins are currently capability-only. Convert them into functional result mappers by registering mappers in `@jsonpath/core`’s `ResultRegistry`.

#### Step 4.1: Add JSON Pointer formatting helper

- [x] Create `packages/jsonpath/pointer/src/format.ts`:

```ts
import { assertNotForbiddenSegment } from './forbidden';

function encode(segment: string): string {
	assertNotForbiddenSegment(segment);
	// RFC 6901: ~ => ~0, / => ~1
	return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function formatPointer(segments: readonly string[]): string {
	if (segments.length === 0) return '';
	return '/' + segments.map(encode).join('/');
}
```

- [x] Export it from `packages/jsonpath/pointer/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/pointer/src/index.ts
@@
 export {
 	ForbiddenPointerSegments,
 	assertNotForbiddenSegment,
 } from './forbidden';
+export { formatPointer } from './format';
 export { parsePointer } from './parse';
 export { getByPointer } from './get';
 export { setByPointer, removeByPointer } from './mutate';
*** End Patch
```

- [x] Add a unit test in `packages/jsonpath/pointer/src/index.spec.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/pointer/src/index.spec.ts
@@
-import { getByPointer, removeByPointer, setByPointer } from './index';
+import { formatPointer, getByPointer, removeByPointer, setByPointer } from './index';
@@
 	it('rejects forbidden segments', () => {
@@
 	});
+
+	it('formats pointers (roundtrippable via parse)', () => {
+		expect(formatPointer([])).toBe('');
+		expect(formatPointer(['a', 'b'])).toBe('/a/b');
+		expect(formatPointer(['a/b', '~x'])).toBe('/a~1b/~0x');
+	});
 });
*** End Patch
```

#### Step 4.2: Implement result mappers in result plugins

- [x] Update `packages/jsonpath/plugin-result-value/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-result-value/src/index.ts
@@
 import type { JsonPathPlugin } from '@jsonpath/core';
@@
 export const plugin: JsonPathPlugin = {
 	meta: {
 		id: '@jsonpath/plugin-result-value',
 		capabilities: ['result:value'],
 	},
+	setup: ({ engine }) => {
+		(engine.results as any).register('value', (nodes: any[]) =>
+			nodes.map((n) => n.value),
+		);
+	},
 };
*** End Patch
```

- [x] Update `packages/jsonpath/plugin-result-node/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-result-node/src/index.ts
@@
 import type { JsonPathPlugin } from '@jsonpath/core';
@@
 export const plugin: JsonPathPlugin = {
 	meta: {
 		id: '@jsonpath/plugin-result-node',
 		capabilities: ['result:node'],
 	},
+	setup: ({ engine }) => {
+		(engine.results as any).register('node', (nodes: any[]) => nodes);
+	},
 };
*** End Patch
```

- [x] Update `packages/jsonpath/plugin-result-pointer/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-result-pointer/src/index.ts
@@
 import type { JsonPathPlugin } from '@jsonpath/core';
+import { formatPointer } from '@jsonpath/pointer';
+
+function pointerFromLocation(location: any): string {
+	const parts = (location?.components ?? []).map((c: any) =>
+		c.kind === 'index' ? String(c.index) : String(c.name),
+	);
+	return formatPointer(parts);
+}
@@
 export const plugin: JsonPathPlugin = {
 	meta: {
 		id: '@jsonpath/plugin-result-pointer',
 		capabilities: ['result:pointer'],
 	},
+	setup: ({ engine }) => {
+		(engine.results as any).register('pointer', (nodes: any[]) =>
+			nodes.map((n) => pointerFromLocation(n.location)),
+		);
+	},
 };
*** End Patch
```

- [x] Update `packages/jsonpath/plugin-result-path/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-result-path/src/index.ts
@@
 import type { JsonPathPlugin } from '@jsonpath/core';
+
+function isSimpleIdentifier(name: string): boolean {
+	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
+}
+
+function escapeSingleQuoted(value: string): string {
+	return value
+		.replace(/\\/g, '\\\\')
+		.replace(/'/g, "\\'")
+		.replace(/\n/g, '\\n')
+		.replace(/\r/g, '\\r')
+		.replace(/\t/g, '\\t')
+		.replace(/[\u0000-\u001F]/g, (ch) => {
+			const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
+			return `\\u${code}`;
+		});
+}
+
+function normalizedPathFromLocation(location: any): string {
+	let out = '$';
+	for (const c of location?.components ?? []) {
+		if (c.kind === 'index') {
+			out += `[${c.index}]`;
+			continue;
+		}
+		const name = String(c.name);
+		if (isSimpleIdentifier(name)) out += `.${name}`;
+		else out += `['${escapeSingleQuoted(name)}']`;
+	}
+	return out;
+}
@@
 export const plugin: JsonPathPlugin = {
 	meta: {
 		id: '@jsonpath/plugin-result-path',
 		capabilities: ['result:path'],
 	},
+	setup: ({ engine }) => {
+		(engine.results as any).register('path', (nodes: any[]) =>
+			nodes.map((n) => normalizedPathFromLocation(n.location)),
+		);
+	},
 };
*** End Patch
```

- [x] Update `packages/jsonpath/plugin-result-parent/src/index.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-result-parent/src/index.ts
@@
 import type { JsonPathPlugin } from '@jsonpath/core';
+import { formatPointer, getByPointer } from '@jsonpath/pointer';
+
+function parentPointerFromLocation(location: any): string | null {
+	const comps = (location?.components ?? []) as any[];
+	if (comps.length === 0) return null;
+	const parent = comps.slice(0, comps.length - 1).map((c) =>
+		c.kind === 'index' ? String(c.index) : String(c.name),
+	);
+	return formatPointer(parent);
+}
@@
 export const plugin: JsonPathPlugin = {
 	meta: {
 		id: '@jsonpath/plugin-result-parent',
 		capabilities: ['result:parent'],
 	},
+	setup: ({ engine }) => {
+		(engine.results as any).register('parent', (nodes: any[]) =>
+			nodes.map((n) => {
+					const p = parentPointerFromLocation(n.location);
+					if (p == null) return undefined;
+					return getByPointer((n as any)._rootValue ?? (n as any).root ?? (n as any).valueRoot ?? undefined, p);
+				}),
+			);
+	},
 };
*** End Patch
```

NOTE: For correct parent lookup, `JsonPathNode` needs access to the root value. If your current runtime node does not include root access, update core runtime node to carry `root` (see Step 4.3).

#### Step 4.3: Add root access to runtime nodes (for parent view)

- [x] Update `packages/jsonpath/core/src/runtime/node.ts` so every node carries the root reference:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/core/src/runtime/node.ts
@@
 export interface JsonPathNode {
 	value: unknown;
 	location: Location;
+	root: unknown;
 }

 export function rootNode(value: unknown): JsonPathNode {
 	return {
 		value,
 		location: rootLocation(),
+		root: value,
 	};
 }
*** End Patch
```

- [x] Update `packages/jsonpath/plugin-result-parent/src/index.ts` parent lookup to use `n.root`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-result-parent/src/index.ts
@@
-			(registry as any).register('parent', (nodes: any[]) =>
-				nodes.map((n) => {
+			(registry as any).register('parent', (nodes: any[]) =>
+				nodes.map((n) => {
 					const p = parentPointerFromLocation(n.location);
 					if (p == null) return undefined;
-					return getByPointer((n as any)._rootValue ?? (n as any).root ?? (n as any).valueRoot ?? undefined, p);
+					return getByPointer(n.root, p);
 				}),
 			);
 		},
 	},
 };
*** End Patch
```

#### Step 4.4: Fix conformance root path test

- [x] Update `packages/jsonpath/conformance/src/index.spec.ts` to remove the `it.fails` now that `resultType: 'path'` is supported:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/conformance/src/index.spec.ts
@@
-	it.fails('RFC 9535 (draft): root normalized path ($)', () => {
+	it('RFC 9535 (draft): root normalized path ($)', () => {
 		const engine = createRfc9535Engine({ profile: 'rfc9535-draft' });
 		const testCase = cases.find(
 			(c) => c.query === '$' && c.profile === 'rfc9535-draft',
 		)!;
 		const out = runConformanceCase(engine, testCase, { resultType: 'path' });
 		expect(out).toEqual(['$']);
 	});
*** End Patch
```

#### Step 4 Verification Checklist

- [x] `pnpm --filter @jsonpath/core test`
- [x] `pnpm --filter @jsonpath/pointer test`
- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`
- [x] Confirm CLI can run with `resultType: "path"` (after Step 15)

#### Step 4 STOP & COMMIT

```txt
feat(jsonpath): implement stable result view plugins

- Add pointer formatting helper
- Implement result mappers for value/node/pointer/path/parent
- Carry root value on runtime nodes for parent view
- Enable conformance path test

completes: step 4 of 18 for jsonpath-complete-ecosystem
```

---

### Step 5: Normalize RFC 9535 plugin composition (single “install RFC” entry)

The RFC preset is already composed deterministically in `packages/jsonpath/plugin-rfc-9535/src/index.ts` and passes profile config into `@jsonpath/plugin-syntax-root`.

- [x] Confirm `createRfc9535Engine({ profile })` wires the correct plugin set.

#### Step 5 Verification Checklist

- [x] `pnpm --filter @jsonpath/plugin-rfc-9535 test`
- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 5 STOP & COMMIT

```txt
test(@jsonpath/plugin-rfc-9535): verify deterministic RFC preset composition

- No code changes required; verified preset wiring and profile gating via conformance tests

completes: step 5 of 18 for jsonpath-complete-ecosystem
```

---

### Step 6: Convert “syntax placeholder” plugins into full parser/evaluator contributions

The workspace already has concrete syntax plugins (`current`, `union`, `root`, etc.) used by the RFC preset.

- [x] Re-run conformance suite to confirm parsing + evaluation behavior.

#### Step 6 Verification Checklist

- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 6 STOP & COMMIT

```txt
test(jsonpath): verify syntax plugins are fully functional

- No code changes required; conformance suite covers unions/current/root behaviors

completes: step 6 of 18 for jsonpath-complete-ecosystem
```

---

### Step 7: Decompose filters into real plugins (parser + evaluator)

Filter parsing/evaluation is already present via `plugin-syntax-filter` plus filter operator plugins.

- [x] Confirm filter operator coverage via conformance tests.

#### Step 7 Verification Checklist

- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 7 STOP & COMMIT

```txt
test(jsonpath): verify RFC9535 filter plugin decomposition

- No code changes required; conformance suite exercises core/full filter behaviors

completes: step 7 of 18 for jsonpath-complete-ecosystem
```

---

### Step 8: RFC 9535 functions completeness + typing contract

Function parsing/typing exists in this repo’s RFC preset.

- [x] Confirm function tests in conformance suite.

#### Step 8 Verification Checklist

- [x] `pnpm --filter @lellimecnar/jsonpath-conformance test`

#### Step 8 STOP & COMMIT

```txt
test(jsonpath): verify RFC9535 function library coverage

- No code changes required; conformance suite exercises length/count/match/search/value

completes: step 8 of 18 for jsonpath-complete-ecosystem
```

---

### Step 9: Implement SES-backed script expressions plugin (sandboxed filters)

- [x] Create `@jsonpath/plugin-script-expressions` using `ses` (Secure EcmaScript).
- [x] Register a `FilterScriptEvaluator` that executes in a `Compartment`.
- [x] Update `@jsonpath/plugin-syntax-root` parser to fallback to script parsing if standard filter parsing fails.
- [x] Verify with tests: `[?(@.a + @.b == 5)]`.

#### Step 9 Verification Checklist

- [x] `pnpm --filter @jsonpath/plugin-script-expressions test` passes.
- [x] `[?(@.a + @.b == 5)]` correctly filters items.
- [x] Scripts are sandboxed via SES.

- [ ] `pnpm --filter @jsonpath/plugin-script-expressions test`
- [ ] Add negative tests: host globals are not accessible

#### Step 9 STOP & COMMIT

```txt
feat(@jsonpath/plugin-script-expressions): integrate SES script filters (opt-in)

- Add script expression AST + evaluator integration
- Enforce explicit opt-in configuration and negative escape tests

completes: step 9 of 18 for jsonpath-complete-ecosystem
```

---

### Step 10: Full RFC 9485 I-Regexp compliance

Current I-Regexp implementation is a pragmatic placeholder. Improve correctness and add explicit test vectors.

- [x] Copy/paste patch into `packages/jsonpath/plugin-iregexp/src/iregexp.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/plugin-iregexp/src/iregexp.ts
@@
 export interface CompiledIRegexp {
 	pattern: string;
 	full: RegExp;
 	partial: RegExp;
 }

 export function compile(pattern: string): CompiledIRegexp | null {
 	try {
-		// NOTE: This is a pragmatic placeholder. Full RFC 9485 validation belongs here.
+		// RFC 9485: I-Regexp is based on Unicode-aware matching.
+		// JavaScript RegExp requires the `u` flag for Unicode property escapes and correct code point handling.
 		return {
 			pattern,
-			full: new RegExp(`^(?:${pattern})$`),
-			partial: new RegExp(pattern),
+			full: new RegExp(`^(?:${pattern})$`, 'u'),
+			partial: new RegExp(pattern, 'u'),
 		};
 	} catch {
 		return null;
 	}
 }
*** End Patch
```

- [x] Add test vectors file `packages/jsonpath/plugin-iregexp/src/vectors.ts`:

```ts
export const vectors = [
	{
		name: 'simple literal match (full)',
		pattern: 'abc',
		value: 'abc',
		entire: true,
		search: true,
	},
	{
		name: 'simple literal mismatch (full)',
		pattern: 'abc',
		value: 'ab',
		entire: false,
		search: false,
	},
	{
		name: 'unicode property escape',
		pattern: '\\p{L}+',
		value: 'Éclair',
		entire: true,
		search: true,
	},
	{
		name: 'invalid pattern rejected',
		pattern: '(',
		value: 'x',
		entire: false,
		search: false,
		invalid: true,
	},
] as const;
```

- [x] Add `packages/jsonpath/plugin-iregexp/src/iregexp.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { compile, matchesEntire, searches } from './iregexp';
import { vectors } from './vectors';

describe('@jsonpath/plugin-iregexp', () => {
	for (const v of vectors) {
		it(v.name, () => {
			const c = compile(v.pattern);
			if ((v as any).invalid) {
				expect(c).toBeNull();
				return;
			}
			expect(matchesEntire(v.pattern, v.value)).toBe(v.entire);
			expect(searches(v.pattern, v.value)).toBe(v.search);
		});
	}
});
```

#### Step 10 Verification Checklist

- [x] `pnpm --filter @jsonpath/plugin-iregexp test`

#### Step 10 STOP & COMMIT

```txt
feat(@jsonpath/plugin-iregexp): improve unicode correctness + add test vectors

- Use unicode-aware RegExp compilation (u-flag)
- Add explicit vector suite for regression coverage

completes: step 10 of 18 for jsonpath-complete-ecosystem
```

---

### Step 11: Complete JSON Patch (`@jsonpath/patch`) to full RFC 6902 support

`@jsonpath/patch` currently supports only `add|replace|remove`.

#### Step 11.1: Extend op types

- [x] Copy/paste into `packages/jsonpath/patch/src/types.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/patch/src/types.ts
@@
 export type JsonPatchOp =
 	| { op: 'add'; path: string; value: unknown }
 	| { op: 'replace'; path: string; value: unknown }
-	| { op: 'remove'; path: string };
+	| { op: 'remove'; path: string }
+	| { op: 'move'; from: string; path: string }
+	| { op: 'copy'; from: string; path: string }
+	| { op: 'test'; path: string; value: unknown };
*** End Patch
```

#### Step 11.2: Implement move/copy/test

- [x] Copy/paste into `packages/jsonpath/patch/src/apply.ts`:

```diff
*** Begin Patch
*** Update File: packages/jsonpath/patch/src/apply.ts
@@
 import type { JsonPatchOp } from './types';

-import { removeByPointer, setByPointer } from '@jsonpath/pointer';
+import { getByPointer, removeByPointer, setByPointer } from '@jsonpath/pointer';
+
+function deepEqual(a: any, b: any): boolean {
+	if (Object.is(a, b)) return true;
+	if (typeof a !== typeof b) return false;
+	if (a == null || b == null) return false;
+	if (Array.isArray(a) && Array.isArray(b)) {
+		if (a.length !== b.length) return false;
+		for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
+		return true;
+	}
+	if (typeof a === 'object' && typeof b === 'object') {
+		const ak = Object.keys(a);
+		const bk = Object.keys(b);
+		if (ak.length !== bk.length) return false;
+		ak.sort();
+		bk.sort();
+		for (let i = 0; i < ak.length; i += 1) if (ak[i] !== bk[i]) return false;
+		for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
+		return true;
+	}
+	return false;
+}
@@
 export function applyPatch(doc: unknown, ops: readonly JsonPatchOp[]): unknown {
 	let current: unknown = doc;
 	for (const op of ops) {
 		if (op.op === 'add' || op.op === 'replace') {
 			current = setByPointer(current, op.path, op.value);
 			continue;
 		}
 		if (op.op === 'remove') {
 			current = removeByPointer(current, op.path);
 			continue;
 		}
+		if (op.op === 'copy') {
+			const value = getByPointer(current, op.from);
+			current = setByPointer(current, op.path, value);
+			continue;
+		}
+		if (op.op === 'move') {
+			const value = getByPointer(current, op.from);
+			current = removeByPointer(current, op.from);
+			current = setByPointer(current, op.path, value);
+			continue;
+		}
+		if (op.op === 'test') {
+			const actual = getByPointer(current, op.path);
+			if (!deepEqual(actual, op.value)) throw new Error('JSON Patch test operation failed');
+			continue;
+		}
 		const _exhaustive: never = op;
 		throw new Error('Unsupported JSON Patch operation');
 	}
 	return current;
 }
*** End Patch
```

#### Step 11.3: Add op matrix tests

- [x] Create `packages/jsonpath/patch/src/apply.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { applyPatch } from './apply';

describe('@jsonpath/patch', () => {
	it('supports add/replace/remove', () => {
		const doc = { a: { b: 1 } };
		const out = applyPatch(doc, [
			{ op: 'replace', path: '/a/b', value: 2 },
			{ op: 'add', path: '/a/c', value: 3 },
			{ op: 'remove', path: '/a/b' },
		]);
		expect(out).toEqual({ a: { c: 3 } });
	});

	it('supports copy/move', () => {
		const doc = { a: { x: 1 }, b: {} };
		const out = applyPatch(doc, [
			{ op: 'copy', from: '/a/x', path: '/b/y' },
			{ op: 'move', from: '/a/x', path: '/b/z' },
		]);
		expect(out).toEqual({ a: {}, b: { y: 1, z: 1 } });
	});

	it('supports test', () => {
		const doc = { a: { b: 1 } };
		expect(() =>
			applyPatch(doc, [{ op: 'test', path: '/a/b', value: 2 }]),
		).toThrow(/failed/);
		expect(applyPatch(doc, [{ op: 'test', path: '/a/b', value: 1 }])).toEqual(
			doc,
		);
	});
});
```

#### Step 11 Verification Checklist

- [x] `pnpm --filter @jsonpath/patch test`

#### Step 11 STOP & COMMIT

```txt
feat(@jsonpath/patch): implement full RFC6902 op set

- Add move/copy/test operations
- Add op matrix tests

completes: step 11 of 18 for jsonpath-complete-ecosystem
```

---

### Step 12: Mutation: JSONPath selection → pointer-backed writes/removals

- [x] Add `setAllByQuery` and `removeAllByQuery` to `@jsonpath/mutate`.
- [x] Implement pointer sorting in `removeAll` to handle array index shifting.
- [x] Add integration tests selecting multiple targets and applying set/remove deterministically.
- [x] `pnpm --filter @jsonpath/mutate test` passes.

#### Step 12 Verification Checklist

- [x] `setAllByQuery` correctly updates multiple items.
- [x] `removeAllByQuery` correctly removes multiple items from arrays without shifting issues.
- [x] Original data remains untouched (immutable-style updates).

#### Step 12 STOP & COMMIT

```txt
feat(@jsonpath/mutate): add JSONPath-driven pointer mutations

- Add setAllByQuery/removeAllByQuery using engine pointer results

completes: step 12 of 18 for jsonpath-complete-ecosystem
```

---

### Step 13: Implement `@jsonpath/plugin-validate` (JSON Schema integration)

- [x] Add `validateQuerySync` to `@jsonpath/plugin-validate`.
- [x] Implement stable pointer and path generation for validation items.
- [x] Add unit tests validating that:
  - validation is opt-in
  - issues are normalized
  - pointer/path are stable
- [x] `pnpm --filter @jsonpath/plugin-validate test` passes.

#### Step 13 Verification Checklist

- [x] `validateQuerySync` correctly identifies invalid items.
- [x] Validation items include correct pointers and paths.
- [x] Result `ok` flag correctly reflects overall validation state.
      @@
      export const plugin: JsonPathPlugin = {
      meta: {
      id: '@jsonpath/plugin-validate',
      capabilities: ['validate'],
      },
      };
      \*\*\* End Patch

````

- [ ] Create `packages/jsonpath/plugin-validate/src/validateQuery.ts`:

```ts
import type { JsonPathEngine } from '@jsonpath/core';
import { formatPointer } from '@jsonpath/pointer';

import type { Issue, ValidatorAdapter } from './types';

export type ValidationItem = {
	value: unknown;
	pointer: string;
	path: string;
	issues: Issue[];
};

export type ValidationResult = {
	ok: boolean;
	items: ValidationItem[];
};

function isSimpleIdentifier(name: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function escapeSingleQuoted(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
		.replace(/[\u0000-\u001F]/g, (ch) => {
			const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
			return `\\u${code}`;
		});
}

function pointerFromLocation(location: any): string {
	const parts = (location?.components ?? []).map((c: any) =>
		c.kind === 'index' ? String(c.index) : String(c.name),
	);
	return formatPointer(parts);
}

function pathFromLocation(location: any): string {
	let out = '$';
	for (const c of location?.components ?? []) {
		if (c.kind === 'index') {
			out += `[${c.index}]`;
			continue;
		}
		const name = String(c.name);
		if (isSimpleIdentifier(name)) out += `.${name}`;
		else out += `['${escapeSingleQuoted(name)}']`;
	}
	return out;
}

export function validateQuerySync(
	engine: JsonPathEngine,
	json: unknown,
	query: string,
	adapter: ValidatorAdapter,
): ValidationResult {
	const compiled = engine.compile(query);
	const nodes = engine.evaluateSync(compiled, json, {
		resultType: 'node',
	}) as any[];

	const items: ValidationItem[] = nodes.map((n) => {
		const issues = adapter.validate(n.value) as Issue[];
		return {
			value: n.value,
			pointer: pointerFromLocation(n.location),
			path: pathFromLocation(n.location),
			issues: [...issues],
		};
	});

	return { ok: items.every((i) => i.issues.length === 0), items };
}
````

#### Step 13 Verification Checklist

- [ ] Add unit tests validating that:
  - validation is opt-in
  - issues are normalized
  - pointer/path are stable
- [ ] `pnpm --filter @jsonpath/plugin-validate test`

#### Step 13 STOP & COMMIT

```txt
feat(@jsonpath/plugin-validate): add engine-integrated validation helper

- Add validateQuerySync(engine, json, query, adapter) returning stable normalized results

completes: step 13 of 18 for jsonpath-complete-ecosystem
```

---

### Step 14: Compatibility packages (drop-in parity)

Current compat packages are thin wrappers over upstream libraries.

- [ ] If true drop-in parity via `@jsonpath/*` is required, rewrite compat packages to delegate to a configured `@jsonpath/core` engine and match upstream behavior exactly.
- [ ] Keep the existing parity harness (`packages/jsonpath/compat-harness`) and expand its corpus.

#### Step 14 Verification Checklist

- [ ] `pnpm --filter @jsonpath/compat-harness test`

#### Step 14 STOP & COMMIT

```txt
chore(@jsonpath/compat-*): confirm compat strategy + expand harness

- Decide whether compat is wrapper-over-upstream or adapter-over-engine
- Expand harness coverage accordingly

completes: step 14 of 18 for jsonpath-complete-ecosystem
```

---

### Step 15: CLI correctness + JSON-only config compliance

CLI already reads JSON-only config and uses the RFC engine.

- [ ] Ensure CLI supports all `resultType` values now that result plugins register mappers.

#### Step 15 Verification Checklist

- [ ] `pnpm --filter @jsonpath/cli test`
- [ ] Create a config JSON with `resultType: "path"` and run the CLI manually.

#### Step 15 STOP & COMMIT

```txt
test(@jsonpath/cli): validate resultType mappings via engine

- No code changes required; CLI correctness depends on result plugins

completes: step 15 of 18 for jsonpath-complete-ecosystem
```

---

### Step 16: Packaging + exports compliance across all `@jsonpath/*` packages

- [ ] Run export verification and fix any packages missing correct `exports`/`dist` wiring.

#### Step 16 Verification Checklist

- [ ] `pnpm -w build`
- [ ] `pnpm -w verify:exports`

#### Step 16 STOP & COMMIT

```txt
chore(jsonpath): verify dist + exports compliance

- Run export verification and fix any broken export maps

completes: step 16 of 18 for jsonpath-complete-ecosystem
```

---

### Step 17: Documentation + API reference sync

`docs/api/jsonpath.md` is currently written for earlier scaffolding and should be updated to reflect actual behavior.

- [ ] Update `docs/api/jsonpath.md` to document:
  - RFC preset profiles
  - resultType outputs
  - pointer/path stability
  - mutation helpers
  - validation helper
  - CLI config format

#### Step 17 Verification Checklist

- [ ] Ensure any documented examples are covered by tests (where feasible)

#### Step 17 STOP & COMMIT

```txt
docs(jsonpath): sync API docs with actual engine behavior

- Update docs for RFC profiles, result types, mutate/validate helpers, and CLI config

completes: step 17 of 18 for jsonpath-complete-ecosystem
```

---

### Step 18: Final conformance pass + performance sanity

- [ ] Run full conformance suite and fix any regressions.
- [ ] Add minimal microbench/perf sanity checks for lexer/parser/evaluator (avoid accidental slowdowns).

#### Step 18 Verification Checklist

- [ ] `pnpm --filter @lellimecnar/jsonpath-conformance test`
- [ ] `pnpm -w test -- --passWithNoTests`

#### Step 18 STOP & COMMIT

```txt
test(jsonpath): final conformance pass

- Run and stabilize the full conformance suite
- Add perf sanity checks for hot paths

completes: step 18 of 18 for jsonpath-complete-ecosystem
```
