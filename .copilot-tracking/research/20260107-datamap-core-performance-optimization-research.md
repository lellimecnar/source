# Task Research Notes: @data-map/core Performance Optimization

## Research Executed

### File Analysis

- [datamap.ts](../../packages/data-map/core/src/datamap.ts) (938 lines)
  - Main `DataMap` class implementing reactive state container
  - Key methods: `resolve()`, `get()`, `set()`, `patch()`, `batch()`, `transaction()`
  - Uses `cloneSnapshot()` wrapper for `structuredClone` at lines 42-47
  - Subscription notifications on every `get()`/`resolve()` via `scheduleNotify()`
- [utils/jsonpath.ts](../../packages/data-map/core/src/utils/jsonpath.ts) (114 lines)
  - Wrapper around `@jsonpath/jsonpath` and `@jsonpath/pointer`
  - `resolvePointer()` creates new `JSONPointer` instance on each call
  - `queryWithPointers()` calls `jpQuery()` then extracts pointers and values

- [subscription/manager.ts](../../packages/data-map/core/src/subscription/manager.ts) (493 lines)
  - Full subscription lifecycle with bloom filter optimization
  - `SubscriptionManagerImpl` always initialized in constructor
  - `scheduleNotify()` adds to microtask queue even with zero subscribers
  - `handleStructuralChange()` calls `toJSON()` for full clone on any structural change

- [subscription/bloom.ts](../../packages/data-map/core/src/subscription/bloom.ts) (45 lines)
  - BloomFilter with 7 hash computations per lookup (hashCount=7)
  - Overhead for small subscription counts (~0.3-0.5µs per check)

- [path/compile.ts](../../packages/data-map/core/src/path/compile.ts) (439 lines)
  - `compilePathPattern()` has cache via `patternCache` Map
  - Pattern cache is effective for repeated JSONPath queries

- [path/detect.ts](../../packages/data-map/core/src/path/detect.ts) (24 lines)
  - `detectPathType()` uses regex without caching
  - Called on every path access

- [patch/builder.ts](../../packages/data-map/core/src/patch/builder.ts) (99 lines)
  - `ensureParentContainers()` uses `structuredClone` for working copy
  - `buildSetPatch()` creates intermediate containers with cloning

- [patch/apply.ts](../../packages/data-map/core/src/patch/apply.ts) (46 lines)
  - Delegates to `@jsonpath/patch.applyPatch()` with `mutate: false`
  - Returns cloned data by default

- [batch/manager.ts](../../packages/data-map/core/src/batch/manager.ts) (56 lines)
  - Simple stack-based batch tracking
  - No single-clone optimization

- [batch/builder.ts](../../packages/data-map/core/src/batch/builder.ts) (93 lines)
  - `FluentBatchBuilder` clones data immediately in constructor
  - Returns cloned operations in `toPatch()`

- [definitions/registry.ts](../../packages/data-map/core/src/definitions/registry.ts) (172 lines)
  - Has getter cache using WeakMap (good pattern to follow)
  - Automatic invalidation via dependency subscriptions

### Code Search Results

- `structuredClone` usage in core package:
  - [datamap.ts#L46](../../packages/data-map/core/src/datamap.ts#L46) - `cloneSnapshot()` wrapper
  - [batch/builder.ts#L11](../../packages/data-map/core/src/batch/builder.ts#L11) - FluentBatchBuilder constructor
  - [batch/builder.ts#L90](../../packages/data-map/core/src/batch/builder.ts#L90) - `toPatch()` return
  - [patch/builder.ts#L35](../../packages/data-map/core/src/patch/builder.ts#L35) - `ensureParentContainers()` clone
  - [patch/builder.ts#L63](../../packages/data-map/core/src/patch/builder.ts#L63) - container value clone

- Existing caching patterns:
  - [path/compile.ts](../../packages/data-map/core/src/path/compile.ts) - `patternCache` Map for compiled patterns
  - [path/predicate.ts](../../packages/data-map/core/src/path/predicate.ts) - `predicateCache` Map for compiled predicates
  - [definitions/registry.ts](../../packages/data-map/core/src/definitions/registry.ts) - WeakMap for getter cache

- Object pooling patterns (from `@jsonpath/evaluator`):
  - [evaluator/query-result-pool.ts](../../packages/jsonpath/evaluator/src/query-result-pool.ts) - `QueryResultPool` class
  - Uses index-based pooling with `acquire()`, `reset()`, `ownFrom()` pattern

### External Research

- #fetch:https://www.npmjs.com/package/rfdc
  - "Really Fast Deep Clone" - 2-7x faster than `structuredClone`
  - API: `const clone = require('rfdc')(); clone(obj)`
  - Options: `{ proto: false, circles: false }` for maximum speed
  - Weekly downloads: 13.5M, well-maintained, MIT license
  - Supports: Date, Buffer, TypedArray, Map, Set
  - Functions referenced (not cloned)

- #fetch:https://immerjs.github.io/immer/
  - Proxy-based copy-on-write pattern
  - Only clones modified paths (structural sharing)
  - Uses `produce(baseState, draft => { mutations })` pattern
  - 3KB gzipped, first-class JSON Patch support
  - Freezes objects by default to prevent accidental mutation

### Project Conventions

- Standards referenced: TypeScript strict mode, Vitest for testing, Vite for builds
- Instructions followed: Monorepo workspace patterns, `workspace:*` dependencies

## Key Discoveries

### Project Structure

```
packages/data-map/core/src/
├── datamap.ts           # Main class (938 lines)
├── datamap.spec.ts      # Core tests (402 lines)
├── types.ts             # Public types (35 lines)
├── index.ts             # Exports (15 lines)
├── batch/               # Batch operations
├── definitions/         # Computed definitions
├── patch/               # JSON Patch operations
├── path/                # Path parsing/matching
├── subscription/        # Reactive subscriptions
├── utils/               # Utilities
├── __tests__/           # Integration tests
└── __fixtures__/        # Test helpers
```

### Implementation Patterns

**Cloning Pattern (current):**

```typescript
function cloneSnapshot<T>(value: T): T {
	return structuredClone(value);
}
```

**Cache Pattern (from path/compile.ts):**

```typescript
const patternCache = new Map<string, CompiledPathPattern>();
export function compilePathPattern(jsonpath: string): CompiledPathPattern {
	const cached = patternCache.get(jsonpath);
	if (cached) return cached;
	// ... compile ...
	patternCache.set(jsonpath, pattern);
	return pattern;
}
```

**Object Pool Pattern (from @jsonpath/evaluator):**

```typescript
export class QueryResultPool {
	private pool: PooledNode[] = [];
	private index = 0;

	reset(): void {
		this.index = 0;
	}

	acquire(args: AcquireArgs): QueryResultNode {
		let node = this.pool[this.index];
		if (!node) {
			node = new PooledNode();
			this.pool.push(node);
		}
		this.index++;
		// reset properties...
		return node;
	}
}
```

### Complete Examples

**Inline Pointer Resolution (proposed):**

```typescript
export function resolvePointerFast<T = unknown>(
	data: unknown,
	pointer: string,
): T | undefined {
	if (pointer === '') return data as T;
	if (pointer[0] !== '/') return undefined;

	let current: any = data;
	let start = 1;
	let end = pointer.indexOf('/', 1);

	while (end !== -1) {
		const segment = unescapeSegment(pointer.slice(start, end));
		current = current?.[segment];
		if (current === undefined) return undefined;
		start = end + 1;
		end = pointer.indexOf('/', start);
	}

	const lastSegment = unescapeSegment(pointer.slice(start));
	return current?.[lastSegment];
}

function unescapeSegment(seg: string): string {
	if (!seg.includes('~')) return seg;
	return seg.replace(/~1/g, '/').replace(/~0/g, '~');
}
```

**Lazy Subscription Manager (proposed):**

```typescript
class DataMap<T, Ctx> {
	private _subs: SubscriptionManagerImpl<T, Ctx> | null = null;

	private get subs(): SubscriptionManagerImpl<T, Ctx> {
		return (this._subs ??= new SubscriptionManagerImpl(this));
	}

	subscribe(config: SubscriptionConfig<T, Ctx>): Subscription {
		return this.subs.register(config);
	}

	get(path: string, options: CallOptions = {}): unknown {
		// Fast path: no subscriptions
		if (!this._subs) {
			return this.getRaw(path, options);
		}
		// ... existing logic with notifications
	}
}
```

**rfdc Integration (proposed):**

```typescript
import rfdc from 'rfdc';

const fastClone = rfdc({ proto: false, circles: false });

function cloneSnapshot<T>(value: T): T {
	return fastClone(value) as T;
}
```

### API and Schema Documentation

**Public API (must remain backward compatible):**

```typescript
// Core exports from index.ts
export { DataMap } from './datamap';
export type {
	Operation,
	CallOptions,
	DataMapOptions,
	ResolvedMatch,
} from './types';
export type {
	Subscription,
	SubscriptionConfig,
	SubscriptionEvent,
	SubscriptionEventInfo,
	SubscriptionManager,
} from './subscription/types';
export type { Definition, DefinitionFactory } from './definitions/types';
```

**DataMap Class Public Methods:**

- `constructor(initialValue: T, options?: DataMapOptions<T, Ctx>)`
- `get context(): Ctx | undefined`
- `subscribe(config: SubscriptionConfig<T, Ctx>): Subscription`
- `toJSON(): T`
- `getSnapshot(): T`
- `resolve(pathOrPointer: string, options?: CallOptions): ResolvedMatch[]`
- `resolveStream(pathOrPointer: string, options?: CallOptions): Generator<ResolvedMatch>`
- `get(pathOrPointer: string, options?: CallOptions): unknown`
- `getAll(pathOrPointer: string, options?: CallOptions): unknown[]`
- `peek(pointer: string): unknown`
- `set(pathOrPointer: string, value: unknown | ((current: unknown) => unknown), options?: CallOptions): this`
- `set.toPatch(pathOrPointer: string, value: unknown, options?: CallOptions): Operation[]`
- `setAll(...)`, `map(...)`, `patch(...)`, `push(...)`, `pop(...)`, `shift(...)`, `unshift(...)`, `splice(...)`, `sort(...)`, `shuffle(...)`
- `batch<R>(fn: (dm: this) => R): R`
- `batch.set(...)`, `batch.remove(...)`, `batch.merge(...)`, `batch.move(...)`, `batch.copy(...)`
- `transaction<R>(fn: (dm: this) => R): R`
- `equals(other: DataMap<T, Ctx> | T): boolean`
- `extends(other: Partial<T>): boolean`
- `clone(options?: Partial<DataMapOptions<T, Ctx>>): DataMap<T, Ctx>`

### Configuration Examples

**rfdc package.json addition:**

```json
{
	"dependencies": {
		"@jsonpath/core": "workspace:*",
		"@jsonpath/jsonpath": "workspace:*",
		"@jsonpath/patch": "workspace:*",
		"@jsonpath/pointer": "workspace:*",
		"rfdc": "^1.4.1"
	}
}
```

### Technical Requirements

**Node.js Compatibility:**

- Node 24+ (enforced via `engines`)
- ESM modules (`"type": "module"`)

**Dependencies Analysis:**

- Current: `@jsonpath/core`, `@jsonpath/jsonpath`, `@jsonpath/patch`, `@jsonpath/pointer`
- Proposed addition: `rfdc ^1.4.1` (~3KB, no sub-dependencies)

**Build System:**

- Vite for library builds
- Vitest for testing
- TypeScript 5.5

## Recommended Approach

Based on research, the recommended implementation order is:

### Phase 1: Quick Wins (Minimal Breaking Changes)

1. **Add `rfdc` dependency** - Replace `structuredClone` with faster clone
2. **Path detection cache** - Simple Map cache for `detectPathType()`
3. **Optional cloning in `get()`** - Add `clone?: boolean` option (default: true for backward compat)
4. **Conditional notification scheduling** - Early exit if no subscribers

### Phase 2: Core Optimizations

5. **Lazy subscription manager** - Only instantiate when `subscribe()` called
6. **Inline pointer resolution** - Fast path for JSON Pointers
7. **Tiered subscription lookup** - Set for <1000, bloom for larger
8. **Single clone per batch** - Clone once at batch start

### Phase 3: Architectural Changes

9. **Copy-on-write structural sharing** - Only clone modified paths
10. **Object pooling for ResolvedMatch** - Reduce GC pressure

## Implementation Guidance

### File Inventory

| File                      | Lines | Key Functions                                                    | Changes Required        |
| ------------------------- | ----- | ---------------------------------------------------------------- | ----------------------- |
| `datamap.ts`              | 938   | `cloneSnapshot`, `resolve`, `get`, `set`, `patch`, `batch`       | Major refactor          |
| `utils/jsonpath.ts`       | 114   | `resolvePointer`, `pointerExists`, `queryWithPointers`           | Add inline fast path    |
| `subscription/manager.ts` | 493   | `register`, `notify`, `scheduleNotify`, `handleStructuralChange` | Conditional paths       |
| `subscription/bloom.ts`   | 45    | `BloomFilter.add`, `mightContain`                                | Tiered approach         |
| `path/detect.ts`          | 24    | `detectPathType`                                                 | Add cache               |
| `patch/builder.ts`        | 99    | `ensureParentContainers`, `buildSetPatch`                        | Remove defensive clones |
| `patch/apply.ts`          | 46    | `applyOperations`                                                | Add mutate option       |
| `batch/manager.ts`        | 56    | `start`, `collect`, `end`                                        | Single clone tracking   |
| `batch/builder.ts`        | 93    | `FluentBatchBuilder`                                             | Lazy cloning            |

### Dependency Analysis

| Dependency | Version  | Purpose            | Risk                          |
| ---------- | -------- | ------------------ | ----------------------------- |
| `rfdc`     | ^1.4.1   | Fast deep cloning  | Low - drop-in replacement     |
| `immer`    | Optional | Structural sharing | Medium - architectural change |

### Breaking Change Analysis

**Backward Compatible Changes:**

- Adding `clone` option to `get()` (default true)
- Internal caching for path detection
- Lazy subscription manager (same API)
- Using `rfdc` instead of `structuredClone`
- Single clone per batch (internal optimization)

**Potentially Breaking Changes:**

- Changing default of `clone` option to `false` in `get()`
- Removing defensive cloning in constructor (users may expect isolation)
- Object pooling for `ResolvedMatch` (if users store references)

### Test Impact

**27 test files require validation:**

- Core: `datamap.spec.ts`, `batch/batch.spec.ts`, `patch/*.spec.ts`
- Subscription: `subscription/*.spec.ts`
- Path: `path/*.spec.ts`
- Integration: `__tests__/*.spec.ts`

**New tests needed:**

- Performance regression tests (with benchmarks)
- Lazy subscription manager initialization
- Optional cloning behavior
- rfdc edge cases (circular refs, special types)

### Risk Assessment

| Priority | Optimization              | Risk   | Mitigation                        |
| -------- | ------------------------- | ------ | --------------------------------- |
| P1.1     | Lazy cloning              | Medium | Feature flag, extensive tests     |
| P1.2     | Optional clone in get()   | Low    | Backward compat default           |
| P1.3     | Freeze instead of clone   | Low    | Optional opt-in                   |
| P2.1     | Inline pointer resolution | Low    | Unit tests, benchmarks            |
| P2.2     | Path detection cache      | Low    | Bounded cache size                |
| P3.1     | Lazy subscription manager | Medium | API unchanged                     |
| P3.2     | Conditional notification  | Low    | Early exit pattern                |
| P3.3     | Tiered bloom filter       | Low    | Threshold tuning                  |
| P4       | Structural sharing        | High   | Major refactor, needs Immer study |
| P5.1     | Single batch clone        | Medium | Batch semantics testing           |
| P5.2     | Deferred notifications    | Medium | Event ordering tests              |
| P6       | Object pooling            | Medium | Reference lifetime tests          |
| P7       | rfdc cloning              | Low    | Drop-in replacement               |

### Recommended Implementation Order

1. **P7: rfdc cloning** - Immediate 2-3x improvement, zero risk
2. **P2.2: Path detection cache** - Simple, low risk
3. **P3.2: Conditional notification** - Early exit, low risk
4. **P1.2: Optional clone in get()** - API addition, backward compat
5. **P3.1: Lazy subscription manager** - Zero cost when unused
6. **P2.1: Inline pointer resolution** - 20-100x for pointers
7. **P3.3: Tiered subscription lookup** - Replace bloom for small sets
8. **P5.1: Single batch clone** - Batch optimization
9. **P1.1: Lazy cloning strategy** - Requires ownership tracking
10. **P4: Structural sharing** - Major architectural change

### Success Criteria

| Operation       | Current     | Phase 1 Target | Phase 2 Target |
| --------------- | ----------- | -------------- | -------------- |
| Shallow get     | 102x slower | 20x slower     | 5x slower      |
| Deep get        | 843x slower | 100x slower    | 20x slower     |
| Shallow set     | 6x slower   | 3x slower      | 2x slower      |
| Subscribe setup | 7x slower   | 3x slower      | 2x slower      |
| Clone (10 keys) | 40x slower  | 7x slower      | 7x slower      |
