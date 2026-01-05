# JSONPath Gap Remediation Plan

**Branch:** `feat/jsonpath-gap-remediation`
**Description:** Complete implementation of all unimplemented gaps identified in the comprehensive audit report, achieving full specification compliance.

## Goal

Bring the `@jsonpath/*` library suite from ~55% compliance to ~95% compliance with the [specification](../../specs/jsonpath.md) and relevant RFCs (RFC 9535, RFC 6901, RFC 6902, RFC 7386). This is a **v0 implementation** where breaking changes are acceptable as long as internal consumers are updated.

> **Note:** JIT compilation (compiler package) is deferred to a future enhancement. This plan focuses on interpreter-mode correctness and API completeness.

---

## References

- **Audit Report:** [plans/jsonpath-comprehensive-audit-report.md](../jsonpath-comprehensive-audit-report.md)
- **Specification:** [specs/jsonpath.md](../../specs/jsonpath.md)
- **RFC 9535 (JSONPath):** https://www.rfc-editor.org/rfc/rfc9535.html
- **RFC 6901 (JSON Pointer):** https://www.rfc-editor.org/rfc/rfc6901.html
- **RFC 6902 (JSON Patch):** https://www.rfc-editor.org/rfc/rfc6902.html
- **RFC 7386 (JSON Merge Patch):** https://www.rfc-editor.org/rfc/rfc7386.html
- **RFC 9485 (I-Regexp):** https://www.rfc-editor.org/rfc/rfc9485.html

---

## Implementation Steps

---

### Step 1: Core Package Foundation (P0/P1)

**Files:**

- `packages/jsonpath/core/src/types.ts`
- `packages/jsonpath/core/src/utils.ts`
- `packages/jsonpath/core/src/nothing.ts` _(new)_
- `packages/jsonpath/core/src/index.ts`
- `packages/jsonpath/core/src/__tests__/nothing.spec.ts` _(new)_
- `packages/jsonpath/core/src/__tests__/utils.spec.ts`

**What:**
Add the `Nothing` symbol type per [RFC 9535 §2.1](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.1) and [spec L240-260](../../specs/jsonpath.md#L240). Implement missing utility functions (`deepClone`, `freeze`) per [spec L382-420](../../specs/jsonpath.md#L382). Add comprehensive type guards (`isObject`, `isArray`, `isPrimitive`).

**Implementation Details:**

1. Create `nothing.ts` with:

   ```typescript
   export const Nothing = Symbol.for('@jsonpath/nothing');
   export type Nothing = typeof Nothing;
   export function isNothing(value: unknown): value is Nothing;
   ```

2. Update `types.ts` to export `Nothing` in `JSONValue` union type.

3. Add to `utils.ts`:

   ```typescript
   export function deepClone<T>(value: T): T; // Use structuredClone with fallback
   export function freeze<T>(value: T): Readonly<T>; // Recursive Object.freeze
   export function isObject(v: unknown): v is JSONObject;
   export function isArray(v: unknown): v is JSONArray;
   export function isPrimitive(v: unknown): v is JSONPrimitive;
   ```

4. Update all packages that return `undefined` for "no value" to return `Nothing` symbol.

**Testing:**

- Unit tests for `Nothing` symbol equality and identity
- Tests for `deepClone` with circular reference handling
- Tests for `freeze` recursion on nested objects/arrays
- Verify `deepEqual` handles `Nothing` correctly

**Spec References:**

- [RFC 9535 §2.1](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.1) - Nothing type
- [spec L240-260](../../specs/jsonpath.md#L240) - Nothing symbol
- [spec L382-420](../../specs/jsonpath.md#L382) - Utility functions

---

### Step 2: Parser AST Node Additions (P1/P2)

**Files:**

- `packages/jsonpath/parser/src/types.ts`
- `packages/jsonpath/parser/src/parser.ts`
- `packages/jsonpath/parser/src/nodes.ts`
- `packages/jsonpath/parser/src/__tests__/parser.spec.ts`

**What:**
Add missing AST node types: `RootSelector`, `CurrentSelector`, `LogicalExpr`, `ComparisonExpr`, `FilterQuery`. Add missing properties: `QueryNode.raw`, `NameSelectorNode.quoted`, `LiteralNode.raw`. Fix slice property naming (`start/end/step` vs `startValue/endValue/stepValue`). Implement `ParserOptions.strict` mode per [spec L701-710](../../specs/jsonpath.md#L701).

**Implementation Details:**

1. Add to `NodeType` enum:

   ```typescript
   RootSelector = 'RootSelector',
   CurrentSelector = 'CurrentSelector',
   LogicalExpr = 'LogicalExpr',
   ComparisonExpr = 'ComparisonExpr',
   FilterQuery = 'FilterQuery',
   ```

2. Add interfaces:

   ```typescript
   export interface RootSelectorNode extends ASTNode {
   	readonly type: NodeType.RootSelector;
   }
   export interface CurrentSelectorNode extends ASTNode {
   	readonly type: NodeType.CurrentSelector;
   }
   ```

3. Update `QueryNode` interface:

   ```typescript
   export interface QueryNode extends ASTNode {
   	readonly raw: string; // Original query string
   	// ...existing
   }
   ```

4. Update `SliceSelectorNode` to use `start/end/step` (add aliases for backwards compat).

5. Add `parseExpression(input: string): ExpressionNode` standalone parser.

6. Implement `ParserOptions.strict` to reject extensions.

**Testing:**

- Parse `$` and verify `RootSelector` node
- Parse `@` in filters and verify `CurrentSelector` node
- Verify `QueryNode.raw` matches input
- Test strict mode rejects unknown selectors
- Verify backwards compatibility with existing consumers

**Spec References:**

- [spec L565-566](../../specs/jsonpath.md#L565) - RootSelector, CurrentSelector
- [spec §4.3](../../specs/jsonpath.md#43-jsonpathparser) - AST nodes
- [spec L701-710](../../specs/jsonpath.md#L701) - ParserOptions.strict

---

### Step 3: Evaluator Options & Class (P0/P1)

**Files:**

- `packages/jsonpath/evaluator/src/options.ts`
- `packages/jsonpath/evaluator/src/evaluator.ts`
- `packages/jsonpath/evaluator/src/evaluate.ts`
- `packages/jsonpath/evaluator/src/circular.ts` _(new)_
- `packages/jsonpath/evaluator/src/slice.ts`
- `packages/jsonpath/evaluator/src/__tests__/options.spec.ts`
- `packages/jsonpath/evaluator/src/__tests__/circular.spec.ts` _(new)_

**What:**
Implement full `EvaluatorOptions` enforcement: `maxFilterDepth`, `detectCircular`. Verify `maxDepth`, `maxResults`, `maxNodes` are correctly enforced. Add `Evaluator` class as spec requires. Verify slice normalization per [RFC 9535 §2.3.4.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.4.2).

**Implementation Details:**

1. Create `circular.ts`:

   ```typescript
   export function createCircularDetector(): {
   	enter(value: unknown): boolean; // Returns true if circular
   	leave(value: unknown): void;
   };
   ```

2. Update `evaluate.ts` to:
   - Track filter expression depth, throw when > `maxFilterDepth`
   - Use circular detector when `detectCircular: true`
   - Early-terminate when `maxResults` reached

3. Create `Evaluator` class:

   ```typescript
   export class Evaluator {
   	constructor(options?: EvaluatorOptions);
   	evaluate<T>(ast: QueryNode, data: unknown): QueryResult<T>;
   	*stream<T>(ast: QueryNode, data: unknown): Generator<QueryNode<T>>;
   }
   ```

4. Verify slice normalization handles:
   - Negative indices
   - Step = 0 (throw error)
   - Missing start/end with negative step

**Testing:**

- Test `maxFilterDepth` with deeply nested filters `$[?@[?@[?@.x]]]`
- Test circular reference detection with self-referencing objects
- Test slice edge cases per RFC 9535 examples
- Test `Evaluator` class instantiation and reuse
- Performance test with `maxResults` early termination

**Spec References:**

- [spec L936-956](../../specs/jsonpath.md#L936) - Evaluator options
- [spec L950](../../specs/jsonpath.md#L950) - maxFilterDepth
- [spec L953](../../specs/jsonpath.md#L953) - detectCircular
- [spec L975](../../specs/jsonpath.md#L975) - Evaluator class
- [RFC 9535 §2.3.4.2](https://www.rfc-editor.org/rfc/rfc9535.html#section-2.3.4.2) - Slice normalization

---

### Step 4: Pointer Instance Methods (P1)

**Files:**

- `packages/jsonpath/pointer/src/pointer.ts`
- `packages/jsonpath/pointer/src/relative-pointer.ts`
- `packages/jsonpath/pointer/src/__tests__/pointer.spec.ts`
- `packages/jsonpath/pointer/src/__tests__/relative.spec.ts`

**What:**
Add instance method aliases to `JSONPointer` class for json-p3 compatibility. Complete `RelativePointer` class implementation per [spec L1391-1405](../../specs/jsonpath.md#L1391).

**Implementation Details:**

1. Update `JSONPointer` class:

   ```typescript
   class JSONPointer {
   	// Existing static methods...

   	// Instance method aliases for json-p3 compat
   	resolve<T>(data: unknown): T | undefined;
   	resolveOrThrow<T>(data: unknown): T;
   	exists(data: unknown): boolean;
   	set<T>(data: T, value: unknown): T;
   	remove<T>(data: T): T;

   	// String conversion
   	toString(): string;
   	toJSON(): string;
   }
   ```

2. Complete `RelativePointer` class:
   ```typescript
   class RelativePointer {
   	constructor(reference: string);
   	readonly reference: string;
   	readonly upCount: number;
   	readonly keyAccess: boolean;
   	readonly pointer: JSONPointer | null;

   	resolve(data: unknown, current: JSONPointer): unknown;
   	toString(): string;
   }
   ```

**Testing:**

- Instance method chaining: `new JSONPointer('/a/b').resolve(data)`
- Relative pointer parsing: `0`, `1/foo`, `2#`
- Relative pointer resolution from various positions
- json-p3 compatibility test suite

**Spec References:**

- [spec §4.7](../../specs/jsonpath.md#47-jsonpathpointer) - Pointer specification
- [spec L1373-1410](../../specs/jsonpath.md#L1373) - Relative JSON Pointer
- [spec L1391-1405](../../specs/jsonpath.md#L1391) - RelativePointer class

---

### Step 5: Patch Options & Advanced Features (P1/P2)

**Files:**

- `packages/jsonpath/patch/src/patch.ts`
- `packages/jsonpath/patch/src/options.ts` _(new)_
- `packages/jsonpath/patch/src/inverse.ts` _(new)_
- `packages/jsonpath/patch/src/validation.ts`
- `packages/jsonpath/patch/src/builder.ts`
- `packages/jsonpath/patch/src/jsonpath-ops.ts` _(new)_
- `packages/jsonpath/patch/src/__tests__/options.spec.ts` _(new)_
- `packages/jsonpath/patch/src/__tests__/inverse.spec.ts` _(new)_

**What:**
Implement full `ApplyOptions` per [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch): `mutate`, `validate`, `continueOnError`, `inverse`, `before/after` hooks. Replace `atomic` option with `mutate` (**breaking change**). Add `applyWithErrors()`, `applyWithInverse()`. Add `validate(ops)` standalone function. Extend builder with conditional operations. Add JSONPath-based bulk operations.

**Implementation Details:**

1. Update `ApplyOptions` (**breaking change** - remove `atomic`, add `mutate`):

   ```typescript
   interface ApplyOptions {
   	mutate?: boolean; // Default: false (immutable)
   	validate?: boolean; // Default: true
   	continueOnError?: boolean;
   	inverse?: boolean;
   	before?: (data: unknown, op: PatchOperation, index: number) => void;
   	after?: (
   		data: unknown,
   		op: PatchOperation,
   		index: number,
   		result: unknown,
   	) => void;
   }
   ```

2. Create `inverse.ts`:

   ```typescript
   export function generateInverse(
   	op: PatchOperation,
   	data: unknown,
   ): PatchOperation;
   export function applyWithInverse<T>(
   	ops: PatchDocument,
   	data: T,
   	options?: ApplyOptions,
   ): ApplyResultWithInverse<T>;
   ```

3. Add `applyWithErrors()`:

   ```typescript
   export function applyWithErrors<T>(
   	ops: PatchDocument,
   	data: T,
   	options?: ApplyOptions,
   ): {
   	result: T;
   	errors: Array<{ index: number; operation: PatchOperation; error: Error }>;
   };
   ```

4. Extend `PatchBuilder`:

   ```typescript
   class PatchBuilder {
   	// Existing methods...
   	when(condition: boolean): this;
   	ifExists(path: string): this;
   	replaceAll(jsonpath: string, value: unknown): this;
   	removeAll(jsonpath: string): this;
   }
   ```

5. Create `jsonpath-ops.ts`:

   ```typescript
   export function applyWithJSONPath<T>(
   	ops: JSONPathPatchOperation[],
   	data: T,
   	options?: ApplyOptions,
   ): T;
   export function toPatchOperations(
   	data: unknown,
   	ops: JSONPathPatchOperation[],
   ): PatchOperation[];
   ```

6. Update internal consumers (`@data-map/core`, etc.) to use new `mutate` option.

**Testing:**

- `mutate: false` preserves original
- `continueOnError: true` collects all errors
- Inverse operations correctly undo changes
- Before/after hooks called in order
- JSONPath operations affect all matches
- Conditional builder operations

**Spec References:**

- [spec §4.8](../../specs/jsonpath.md#48-jsonpathpatch) - Patch specification
- [spec L1615](../../specs/jsonpath.md#L1615) - applyWithInverse
- [spec L1724](../../specs/jsonpath.md#L1724) - Conditional builder

---

### Step 6: Merge Patch Utilities (P2)

**Files:**

- `packages/jsonpath/merge-patch/src/merge-patch.ts`
- `packages/jsonpath/merge-patch/src/validation.ts` _(new)_
- `packages/jsonpath/merge-patch/src/trace.ts` _(new)_
- `packages/jsonpath/merge-patch/src/convert.ts` _(new)_
- `packages/jsonpath/merge-patch/src/__tests__/validation.spec.ts` _(new)_
- `packages/jsonpath/merge-patch/src/__tests__/convert.spec.ts` _(new)_

**What:**
Add missing merge-patch utilities per [spec §4.9](../../specs/jsonpath.md#49-jsonpathmerge-patch): `isValidMergePatch()`, `mergePatchWithTrace()`, `toJSONPatch()`, `fromJSONPatch()`.

**Implementation Details:**

1. Create `validation.ts`:

   ```typescript
   export function isValidMergePatch(patch: unknown): patch is JSONValue;
   ```

2. Create `trace.ts`:

   ```typescript
   export interface MergePatchOperation {
   	type: 'set' | 'delete';
   	path: string;
   	value?: unknown;
   	oldValue?: unknown;
   }

   export interface MergePatchResult<T> {
   	result: T;
   	trace: MergePatchOperation[];
   }

   export function mergePatchWithTrace<T>(
   	target: T,
   	patch: unknown,
   	options?: MergePatchOptions,
   ): MergePatchResult<T>;
   ```

3. Create `convert.ts`:
   ```typescript
   export function toJSONPatch(
   	target: unknown,
   	patch: unknown,
   ): PatchOperation[];
   export function fromJSONPatch(operations: PatchOperation[]): unknown;
   ```

**Testing:**

- Valid merge patch detection (no arrays with null, etc.)
- Trace captures all operations in order
- `toJSONPatch` produces equivalent RFC 6902 operations
- Round-trip: `fromJSONPatch(toJSONPatch(target, patch))` ≈ patch

**Spec References:**

- [spec §4.9](../../specs/jsonpath.md#49-jsonpathmerge-patch) - Merge patch specification
- [spec L2326](../../specs/jsonpath.md#L2326) - isValidMergePatch
- [spec L2332](../../specs/jsonpath.md#L2332) - mergePatchWithTrace
- [spec L2354-2370](../../specs/jsonpath.md#L2354) - Conversion functions

---

### Step 7: Functions Package Improvements (P1/P2)

**Files:**

- `packages/jsonpath/functions/src/index.ts`
- `packages/jsonpath/functions/src/builtins.ts`
- `packages/jsonpath/functions/src/i-regexp.ts`
- `packages/jsonpath/functions/src/__tests__/i-regexp.spec.ts`

**What:**
Add `registerBuiltinFunctions()` export for explicit registration. Add individual function exports (`registerLength`, etc.). Improve I-Regexp (RFC 9485) compliance. Standardize return values to `null` for Nothing.

**Implementation Details:**

1. Add explicit registration:

   ```typescript
   export function registerBuiltinFunctions(): void;
   export function registerLength(): void;
   export function registerCount(): void;
   export function registerMatch(): void;
   export function registerSearch(): void;
   export function registerValue(): void;
   ```

2. Improve I-Regexp handling per [RFC 9485](https://www.rfc-editor.org/rfc/rfc9485.html):

   ```typescript
   export function convertIRegexp(pattern: string): RegExp;
   export function validateIRegexp(pattern: string): {
   	valid: boolean;
   	error?: string;
   };
   ```

3. Standardize returns:
   - All functions return `null` (not `undefined`) for Nothing
   - Use `Nothing` symbol internally where appropriate

**Testing:**

- I-Regexp validation (reject lookahead, backreferences, etc.)
- Explicit registration vs auto-registration
- All functions return `null` for invalid input

**Spec References:**

- [spec §4.4](../../specs/jsonpath.md#44-jsonpathfunctions) - Functions specification
- [spec L866-920](../../specs/jsonpath.md#L866) - I-Regexp compliance
- [RFC 9485](https://www.rfc-editor.org/rfc/rfc9485.html) - I-Regexp

---

### Step 8: Facade Configuration & Multi-Query (P1/P2)

**Files:**

- `packages/jsonpath/jsonpath/src/config.ts`
- `packages/jsonpath/jsonpath/src/cache.ts`
- `packages/jsonpath/jsonpath/src/multi-query.ts` _(new)_
- `packages/jsonpath/jsonpath/src/query-set.ts` _(new)_
- `packages/jsonpath/jsonpath/src/index.ts`
- `packages/jsonpath/jsonpath/src/__tests__/config.spec.ts` _(new)_
- `packages/jsonpath/jsonpath/src/__tests__/multi-query.spec.ts` _(new)_

**What:**
Implement full configuration API: `configure()`, `getConfig()`, `reset()`. Add cache management: `clearCache()`, `getCacheStats()`. Implement `multiQuery()` and `createQuerySet()` for efficient multi-query execution.

**Implementation Details:**

1. Complete configuration API:

   ```typescript
   export function configure(options: Partial<JSONPathConfig>): void;
   export function getConfig(): Readonly<JSONPathConfig>;
   export function reset(): void;
   ```

2. Cache management:

   ```typescript
   export function clearCache(): void;
   export function getCacheStats(): {
   	size: number;
   	hits: number;
   	misses: number;
   };
   ```

3. Create `multi-query.ts`:

   ```typescript
   export function multiQuery(
   	data: unknown,
   	queries: string[] | Record<string, string>,
   	options?: QueryOptions,
   ): Map<string, QueryResult> | Record<string, QueryResult>;
   ```

4. Create `query-set.ts`:
   ```typescript
   export class QuerySet {
   	constructor(
   		queries: Array<{ name: string; path: string }> | Record<string, string>,
   	);
   	execute(data: unknown): Record<string, QueryResult>;
   	add(name: string, path: string): this;
   	remove(name: string): boolean;
   	readonly names: string[];
   }
   ```

**Testing:**

- Configuration persists across calls
- `reset()` restores defaults
- Cache stats track hits/misses
- `multiQuery` executes all queries in single traversal
- `QuerySet` is reusable and mutable

**Spec References:**

- [spec L1960-1970](../../specs/jsonpath.md#L1960) - Configuration API
- [spec L2022-2030](../../specs/jsonpath.md#L2022) - Multi-query
- [spec §4.10](../../specs/jsonpath.md#410-jsonpathjsonpath-facade) - Facade specification

---

### Step 9: Secure Query & Additional Utilities (P1/P2)

**Files:**

- `packages/jsonpath/jsonpath/src/secure.ts` _(new)_
- `packages/jsonpath/jsonpath/src/transform.ts`
- `packages/jsonpath/jsonpath/src/merge.ts` _(new)_
- `packages/jsonpath/jsonpath/src/__tests__/secure.spec.ts` _(new)_

**What:**
Implement `secureQuery()` with full path restrictions per [spec L2116-2120](../../specs/jsonpath.md#L2116). Add `transformAll()`, `projectWith()`, `merge()`, `mergeWith()` utilities.

**Implementation Details:**

1. Create `secure.ts`:

   ```typescript
   export function secureQuery<T>(
   	path: string,
   	data: unknown,
   	options: SecureQueryOptions,
   ): QueryResult<T>;
   ```

   Implements:
   - `allowPaths` / `blockPaths` filtering
   - `noRecursive` blocks `..`
   - `noFilters` blocks `?(...)`
   - `maxQueryLength` validation

2. Add to `transform.ts`:

   ```typescript
   export function transformAll<T>(
   	data: T,
   	transforms: Array<{
   		path: string;
   		fn: (value: unknown, node: QueryNode) => unknown;
   	}>,
   ): T;

   export function projectWith<T>(
   	data: unknown,
   	projection: Record<
   		string,
   		{ path: string; transform?: (v: unknown) => unknown }
   	>,
   ): T;
   ```

3. Create `merge.ts`:
   ```typescript
   export function merge<T>(target: T, ...sources: unknown[]): T;
   export function mergeWith<T>(
   	target: T,
   	sources: unknown[],
   	options: MergeOptions,
   ): T;
   ```

**Testing:**

- Secure query blocks disallowed paths
- Secure query respects all restriction options
- Transform functions receive correct node metadata
- Merge handles arrays per MergeOptions

**Spec References:**

- [spec L2116-2120](../../specs/jsonpath.md#L2116) - secureQuery
- [spec §4.10](../../specs/jsonpath.md#410-jsonpathjsonpath-facade) - Utility functions

---

### Step 10: Plugin Context & Infrastructure (P1)

**Files:**

- `packages/jsonpath/core/src/plugins.ts`
- `packages/jsonpath/core/src/plugin-context.ts` _(new)_
- `packages/jsonpath/jsonpath/src/plugins.ts`
- `packages/jsonpath/jsonpath/src/__tests__/plugins.spec.ts`

**What:**
Implement proper `PluginContext` for function/selector registration per [spec §5.1](../../specs/jsonpath.md#51-plugin-architecture). Add plugin dependency resolution and version management.

**Implementation Details:**

1. Create `plugin-context.ts`:

   ```typescript
   export interface PluginContext {
   	registerFunction(def: FunctionDefinition): void;
   	registerSelector(def: SelectorDefinition): void;
   	registerOperator(def: OperatorDefinition): void;
   	readonly config: Readonly<JSONPathConfig>;
   }

   export function createPluginContext(config: JSONPathConfig): PluginContext;
   ```

2. Update `PluginManager`:
   ```typescript
   class PluginManager {
   	// Existing...
   	resolveDependencies(plugins: Plugin[]): Plugin[]; // Topological sort
   	checkVersionCompatibility(plugin: Plugin): boolean;
   }
   ```

**Testing:**

- Plugin registers functions via context
- Dependency resolution orders plugins correctly
- Circular dependencies throw error
- Version incompatibility warnings

**Spec References:**

- [spec §5.1](../../specs/jsonpath.md#51-plugin-architecture) - Plugin architecture

---

### Step 11: Plugin Package - Extended Selectors (P2)

**Files:**

- `packages/jsonpath/plugin-extended/package.json` _(new package)_
- `packages/jsonpath/plugin-extended/src/index.ts` _(new)_
- `packages/jsonpath/plugin-extended/src/parent-selector.ts` _(new)_
- `packages/jsonpath/plugin-extended/src/property-name-selector.ts` _(new)_
- `packages/jsonpath/plugin-extended/src/__tests__/extended.spec.ts` _(new)_

**What:**
Create `@jsonpath/plugin-extended` package with parent (`^`) and property name (`~`) selectors per [spec §5.2](../../specs/jsonpath.md#52-jsonpathplugin-extended).

**Implementation Details:**

1. Create new package with structure:

   ```
   packages/jsonpath/plugin-extended/
   ├── package.json
   ├── tsconfig.json
   ├── vite.config.ts
   └── src/
       ├── index.ts
       ├── parent-selector.ts
       └── property-name-selector.ts
   ```

2. Implement parent selector (^):
   - Returns parent node of current node
   - Works with array and object parents
   - Returns empty for root nodes

3. Implement property name selector (~):
   - Returns the key/index of current node
   - Returns string for object keys
   - Returns number for array indices

**Testing:**

- `$..book.author^` returns book objects
- `$.store.book[*]~` returns indices [0, 1, 2, ...]
- Edge cases: root parent, nested access

**Spec References:**

- [spec §5.2](../../specs/jsonpath.md#52-jsonpathplugin-extended) - Extended selectors
- [spec L2434-2495](../../specs/jsonpath.md#L2434) - Implementation details

---

### Step 12: Plugin Package - Type Functions (P2)

**Files:**

- `packages/jsonpath/plugin-types/package.json` _(new package)_
- `packages/jsonpath/plugin-types/src/index.ts` _(new)_
- `packages/jsonpath/plugin-types/src/predicates.ts` _(new)_
- `packages/jsonpath/plugin-types/src/coercion.ts` _(new)_
- `packages/jsonpath/plugin-types/src/__tests__/types.spec.ts` _(new)_

**What:**
Create `@jsonpath/plugin-types` package with type checking and coercion functions per [spec §5.3](../../specs/jsonpath.md#53-jsonpathplugin-types).

**Implementation Details:**

Type predicates: `isString`, `isNumber`, `isInteger`, `isBoolean`, `isNull`, `isArray`, `isObject`

Type coercion: `toNumber`, `toString`, `toBoolean`

**Testing:**

- All predicates return boolean
- Coercion handles edge cases (NaN, empty string, etc.)
- Functions integrate with filter expressions

**Spec References:**

- [spec §5.3](../../specs/jsonpath.md#53-jsonpathplugin-types) - Type functions
- [spec L2498-2608](../../specs/jsonpath.md#L2498) - Implementation details

---

### Step 13: Plugin Package - Arithmetic (P2)

**Files:**

- `packages/jsonpath/plugin-arithmetic/package.json` _(new package)_
- `packages/jsonpath/plugin-arithmetic/src/index.ts` _(new)_
- `packages/jsonpath/plugin-arithmetic/src/operators.ts` _(new)_
- `packages/jsonpath/plugin-arithmetic/src/__tests__/arithmetic.spec.ts` _(new)_

**What:**
Create `@jsonpath/plugin-arithmetic` package with arithmetic operators per [spec §5.4](../../specs/jsonpath.md#54-jsonpathplugin-arithmetic).

**Implementation Details:**

Operators: `+`, `-`, `*`, `/`, `%`

Requirements:

- Operators work on numeric values only
- Division by zero returns `null`
- Type coercion from strings where unambiguous

**Testing:**

- Basic arithmetic: `$[?@.price * @.quantity > 100]`
- Division by zero handling
- Non-numeric operand handling

**Spec References:**

- [spec §5.4](../../specs/jsonpath.md#54-jsonpathplugin-arithmetic) - Arithmetic operators
- [spec L2611-2700](../../specs/jsonpath.md#L2611) - Implementation details

---

### Step 14: Plugin Package - Extras (P2)

**Files:**

- `packages/jsonpath/plugin-extras/package.json` _(new package)_
- `packages/jsonpath/plugin-extras/src/index.ts` _(new)_
- `packages/jsonpath/plugin-extras/src/string-functions.ts` _(new)_
- `packages/jsonpath/plugin-extras/src/array-functions.ts` _(new)_
- `packages/jsonpath/plugin-extras/src/aggregation-functions.ts` _(new)_
- `packages/jsonpath/plugin-extras/src/__tests__/extras.spec.ts` _(new)_

**What:**
Create `@jsonpath/plugin-extras` package with utility functions per [spec §5.5](../../specs/jsonpath.md#55-jsonpathplugin-extras).

**Implementation Details:**

String functions: `lowercase`, `uppercase`, `trim`, `startsWith`, `endsWith`, `contains`, `replace`, `substring`, `split`

Array/Object functions: `keys`, `values`, `entries`, `first`, `last`, `reverse`, `sort`, `unique`, `flatten`

Aggregation functions: `min`, `max`, `sum`, `avg`

Utility functions: `floor`, `ceil`, `round`, `abs`

**Testing:**

- Each function with valid inputs
- Edge cases (empty arrays, null values)
- Integration with queries

**Spec References:**

- [spec §5.5](../../specs/jsonpath.md#55-jsonpathplugin-extras) - Extras functions
- [spec L2700-2900](../../specs/jsonpath.md#L2700) - Implementation details

---

### Step 15: Plugin Package - Path Builder (P3)

**Files:**

- `packages/jsonpath/plugin-path-builder/package.json` _(new package)_
- `packages/jsonpath/plugin-path-builder/src/index.ts` _(new)_
- `packages/jsonpath/plugin-path-builder/src/builder.ts` _(new)_
- `packages/jsonpath/plugin-path-builder/src/__tests__/builder.spec.ts` _(new)_

**What:**
Create `@jsonpath/plugin-path-builder` package with fluent, type-safe API for constructing JSONPath queries per [spec §5.6](../../specs/jsonpath.md#56-jsonpathplugin-path-builder).

**Implementation Details:**

```typescript
export class PathBuilder {
	static root(): PathBuilder;
	child(name: string): this;
	index(i: number): this;
	wildcard(): this;
	descendant(): this;
	slice(start?: number, end?: number, step?: number): this;
	filter(expr: string | FilterBuilder): this;
	toString(): string;
	toAST(): QueryNode;
}

export class FilterBuilder {
	static current(): FilterBuilder;
	prop(name: string): this;
	eq(value: unknown): this;
	gt(value: number): this;
	// ... etc
	toString(): string;
}
```

**Testing:**

- Builder produces valid JSONPath strings
- Complex queries with filters
- Type safety prevents invalid combinations

**Spec References:**

- [spec §5.6](../../specs/jsonpath.md#56-jsonpathplugin-path-builder) - Path builder

---

### Step 16: Performance Benchmarks & Bundle Analysis (P2)

**Files:**

- `packages/jsonpath/benchmarks/suite.ts` _(new)_
- `packages/jsonpath/benchmarks/scenarios/` _(new directory)_
- `packages/jsonpath/benchmarks/compare.ts` _(new)_
- `.github/workflows/performance.yml` _(new)_

**What:**
Create comprehensive benchmark suite per [spec §9](../../specs/jsonpath.md#9-performance-requirements). Add bundle size analysis. Integrate into CI for regression detection.

**Implementation Details:**

1. Benchmark scenarios:
   - Simple property access: `$.store.name`
   - Deep nesting: `$.a.b.c.d.e.f.g`
   - Wildcard: `$.store.book[*].price`
   - Filter: `$[?@.price > 10]`
   - Descendant: `$..author`
   - Complex combined: `$..[?@.price > 10].title`

2. Metrics to track:
   - Operations per second
   - Memory usage
   - Compilation time (for compiler)
   - Cache efficiency

3. Bundle size analysis:
   - Track each package size
   - Track tree-shaking effectiveness
   - Compare against targets (<15KB gzipped full)

**Testing:**

- Benchmarks run successfully
- Results comparable to json-p3 baseline
- Bundle sizes within targets

**Spec References:**

- [spec §9](../../specs/jsonpath.md#9-performance-requirements) - Performance requirements
- [spec L220-235](../../specs/jsonpath.md#L220) - Bundle size targets

---

### Step 17: Compliance Test Suite Integration (P0 - All RFCs Required)

**Files:**

- `packages/jsonpath/evaluator/src/__tests__/rfc9535-cts.spec.ts` _(new)_
- `packages/jsonpath/patch/src/__tests__/rfc6902-suite.spec.ts` _(update)_
- `packages/jsonpath/pointer/src/__tests__/rfc6901-suite.spec.ts` _(new)_
- `packages/jsonpath/merge-patch/src/__tests__/rfc7386-suite.spec.ts` _(new)_

**What:**
Integrate and pass **ALL 4** RFC compliance test suites (all are must-have). Document any intentional deviations.

**Implementation Details:**

1. **RFC 9535 CTS (JSONPath)** ✅ Must-have:
   - Already downloaded via postinstall
   - Create test runner that executes all CTS tests
   - Document and justify any failures

2. **RFC 6902 (JSON Patch)** ✅ Must-have:
   - Use json-patch-test-suite
   - Ensure all edge cases pass

3. **RFC 6901 (JSON Pointer)** ✅ Must-have:
   - Create comprehensive test suite from RFC examples
   - Test escape sequences, array indices
   - Test URI fragment identifier format

4. **RFC 7386 (JSON Merge Patch)** ✅ Must-have:
   - Test all RFC examples
   - Edge cases with null, arrays

**Testing:**

- All CTS tests pass
- No regressions from existing functionality
- Clear documentation of any deviations

**Spec References:**

- [spec §10](../../specs/jsonpath.md#10-testing-requirements) - Testing requirements
- [RFC 9535 CTS](https://github.com/jsonpath-standard/jsonpath-compliance-test-suite)

---

### Step 18: Documentation & Re-exports (P1)

**Files:**

- `packages/jsonpath/jsonpath/src/index.ts`
- `packages/jsonpath/jsonpath/README.md`
- `docs/api/jsonpath.md` _(update)_

**What:**
Ensure all packages are fully re-exported from the facade per [spec L1895-1900](../../specs/jsonpath.md#L1895). Update documentation to reflect all new features.

**Implementation Details:**

1. Verify re-exports:
   - All core types
   - All error classes
   - All function definitions
   - All pointer utilities
   - All patch operations
   - All merge-patch utilities

2. Add missing convenience exports:
   - Individual patch operations: `patchAdd`, `patchRemove`, etc.
   - Pointer utilities: `parsePointer`, `stringifyPointer`, etc.

3. Update README with:
   - Feature overview
   - Quick start examples
   - API documentation links
   - Migration guide from json-p3

**Testing:**

- All exports are accessible from main package
- TypeScript types are correctly exposed
- Documentation examples work

**Spec References:**

- [spec L1895-1900](../../specs/jsonpath.md#L1895) - Re-exports

---

### Step 19: Final Integration & Cleanup (P0)

**Files:**

- All packages
- `turbo.json`
- `pnpm-workspace.yaml`
- `packages/jsonpath/package.json`

**What:**
Final integration testing across all packages. Ensure build pipeline works. Clean up technical debt. Update version numbers for release.

**Implementation Details:**

1. Integration tests:
   - Test package interoperability
   - Test plugin loading
   - Test with @data-map/core consumer

2. Build verification:
   - All packages build cleanly
   - No circular dependencies
   - ESM and CJS outputs correct

3. Technical debt cleanup:
   - Remove deprecated APIs
   - Consolidate duplicate code
   - Update all TODO comments

4. Release preparation:
   - Update CHANGELOG
   - Version bump (major for breaking, minor for features)
   - Update package.json peer dependencies

**Testing:**

- Full test suite passes
- Build completes without warnings
- Integration tests with consumers pass
- Performance meets targets

**Spec References:**

- [spec §11](../../specs/jsonpath.md#11-build-configuration) - Build configuration
- [spec §12](../../specs/jsonpath.md#12-migration-guide) - Migration guide

---

## Summary

| Step                    | Priority | Complexity | Duration Est. |
| ----------------------- | -------- | ---------- | ------------- |
| 1. Core Foundation      | P0/P1    | S          | 1 day         |
| 2. Parser AST Nodes     | P1/P2    | M          | 2 days        |
| 3. Evaluator Options    | P0/P1    | M          | 2 days        |
| 4. Pointer Methods      | P1       | S          | 1 day         |
| 5. Patch Options        | P1/P2    | M          | 2 days        |
| 6. Merge Patch Utils    | P2       | M          | 1 day         |
| 7. Functions Package    | P1/P2    | S          | 1 day         |
| 8. Facade Config        | P1/P2    | M          | 2 days        |
| 9. Secure Query         | P1/P2    | M          | 1 day         |
| 10. Plugin Context      | P1       | M          | 1 day         |
| 11. Plugin Extended     | P2       | M          | 1 day         |
| 12. Plugin Types        | P2       | S          | 0.5 days      |
| 13. Plugin Arithmetic   | P2       | S          | 0.5 days      |
| 14. Plugin Extras       | P2       | M          | 1 day         |
| 15. Plugin Path Builder | P3       | M          | 1 day         |
| 16. Benchmarks          | P2       | M          | 1 day         |
| 17. Compliance Tests    | P0       | L          | 2 days        |
| 18. Documentation       | P1       | M          | 1 day         |
| 19. Integration         | P0       | L          | 2 days        |

**Total Estimated Duration:** ~23 days (~5 weeks with buffer)

---

## Deferred Items (Future Enhancement)

The following items are deferred to a future enhancement cycle:

| Item                                                             | Priority | Reason                                                                |
| ---------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| JIT Compiler (`@jsonpath/compiler` codegen)                      | P0       | Complex, requires extensive validation; interpreter sufficient for v0 |
| CompiledQuery properties (`.source`, `.ast`, `.compilationTime`) | P0       | Depends on JIT compiler                                               |
| Compiler LRU cache                                               | P1       | Depends on JIT compiler                                               |
| CompilerOptions (`sourceMap`, `optimizeForSmall`, `unsafe`)      | P2       | Depends on JIT compiler                                               |
| Performance target >5M ops/sec                                   | P2       | Requires JIT compilation                                              |

These will be tracked in a separate `plans/jsonpath-jit-compiler/` plan.

---

## Risks & Mitigations

| Risk                                    | Impact | Mitigation                                             |
| --------------------------------------- | ------ | ------------------------------------------------------ |
| Breaking changes for internal consumers | Medium | Update `@data-map/core` and other consumers in same PR |
| Performance regression                  | Medium | Benchmark suite, CI integration, iterate post-release  |
| Plugin architecture complexity          | Low    | Keep plugin interface minimal                          |
| RFC compliance gaps                     | Medium | All 4 RFC test suites are must-have                    |

---

## Decisions Made

Based on clarifying questions, the following decisions are locked in:

1. **JIT Compiler:** Deferred to future enhancement. This is a v0 release focusing on correctness.
2. **Plugin Packages:** Published as separate `@jsonpath/plugin-*` npm packages for tree-shaking.
3. **Breaking Changes:** Acceptable for v0. Internal consumers will be updated in the same PR.
4. **Performance Targets:** Release with interpreter performance; iterate on JIT later.
5. **RFC Test Suites:** All 4 (RFC 9535, 6901, 6902, 7386) are must-have.
