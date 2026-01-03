# DataMap - High-Performance Reactive Data Store

**Branch:** `feat/data-map-core`
**Description:** Implement the core DataMap package providing a high-performance reactive data store with JSONPath/JSON Patch support.

## Goal

DataMap provides a unified API for managing complex application state with predictable mutations (JSON Patch), reactive subscriptions (compiled path patterns), and path-based access (JSONPath/JSON Pointer). This implementation enables efficient state management across the monorepo with O(m) path operations and O(1) subscription lookups.

---

## Implementation Steps

### Step 1: Package Scaffolding & Path Detection

**Files:**

- `packages/data-map/core/package.json`
- `packages/data-map/core/tsconfig.json`
- `packages/data-map/core/vite.config.ts`
- `packages/data-map/core/vitest.config.ts`
- `packages/data-map/core/AGENTS.md`
- `packages/data-map/core/src/index.ts`
- `packages/data-map/core/src/types.ts`
- `packages/data-map/core/src/path/detect.ts`
- `packages/data-map/core/src/path/detect.spec.ts`
- `packages/data-map/core/src/utils/pointer.ts`
- `packages/data-map/core/src/utils/pointer.spec.ts`
- `pnpm-workspace.yaml` (add packages/data-map/\*)

**What:** Create the package structure with build configuration, TypeScript setup, and implement the foundational path detection algorithm (`detectPathType`) and pointer utility functions (`parsePointerSegments`, `escapePointerSegment`). These utilities are used throughout the codebase.

**Testing:**

- Run `pnpm install` to verify workspace registration
- Run `pnpm exec turbo -F @data-map/core test` to verify path detection handles:
  - JSON Pointer: `""`, `"/users/0/name"`, `"#/users"`
  - Relative Pointer: `"0"`, `"1/foo"`, `"2#"`
  - JSONPath: `"$"`, `"$.users[*]"`, `"$..name"`
- Run `pnpm exec turbo -F @data-map/core build` to verify build succeeds

---

### Step 2: Core Read API with json-p3 Integration

**Files:**

- `packages/data-map/core/src/datamap.ts`
- `packages/data-map/core/src/datamap.spec.ts`
- `packages/data-map/core/src/types.ts` (extend)

**What:** Implement the `DataMap` class constructor and read API (`get`, `getAll`, `resolve`) using `json-p3` for JSONPath queries and JSON Pointer resolution. Includes strict/non-strict mode handling and immutable snapshot returns.

**Testing:**

- Unit tests for constructor with initial data
- Unit tests for `get()` with JSON Pointer (simple, nested, arrays)
- Unit tests for `get()` with JSONPath (single result, first of many)
- Unit tests for `getAll()` with wildcards and filters
- Unit tests for `resolve()` returning `ResolvedMatch[]`
- Strict mode: throws on invalid/missing paths
- Non-strict mode: returns undefined/empty arrays

---

### Step 3: Patch Building & Core Write API

**Files:**

- `packages/data-map/core/src/patch/builder.ts`
- `packages/data-map/core/src/patch/builder.spec.ts`
- `packages/data-map/core/src/patch/apply.ts`
- `packages/data-map/core/src/patch/apply.spec.ts`
- `packages/data-map/core/src/datamap.ts` (extend with write methods)
- `packages/data-map/core/src/datamap.spec.ts` (extend)

**What:** Implement patch generation for mutations (`set`, `setAll`, `map`, `patch`) including:

- Minimal RFC 6902 patch generation
- Container type inference (object vs array from path syntax)
- Intermediate container creation for non-existent paths
- Function-based setters receiving current value
- `.toPatch()` variants for preview without application

**Testing:**

- `set()` generates `replace` for existing values
- `set()` generates `add` for new values with intermediate containers
- `setAll()` affects all JSONPath matches
- `map()` transforms values at matched paths
- `patch()` applies RFC 6902 operations directly
- Path syntax `[0]` creates array, `.foo` creates object
- `.toPatch()` returns operations without applying

---

### Step 4: Array Mutation API

**Files:**

- `packages/data-map/core/src/datamap.ts` (extend with array methods)
- `packages/data-map/core/src/datamap.spec.ts` (extend)

**What:** Implement array-specific mutation methods (`push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `shuffle`) with corresponding patch generation. Each generates appropriate `add`/`remove`/`replace` operations.

**Testing:**

- `push()` appends items, generates `add` operations
- `pop()` removes last, generates `remove` operation, returns value
- `splice()` handles insertions, deletions, and replacements
- `sort()` reorders, generates minimal `replace` operations
- All methods have `.toPatch()` variants

---

### Step 5: Compiled Path Pattern System

**Files:**

- `packages/data-map/core/src/path/segments.ts`
- `packages/data-map/core/src/path/compile.ts`
- `packages/data-map/core/src/path/compile.spec.ts`
- `packages/data-map/core/src/path/match.ts`
- `packages/data-map/core/src/path/match.spec.ts`
- `packages/data-map/core/src/path/expand.ts`
- `packages/data-map/core/src/path/expand.spec.ts`

**What:** Implement the CompiledPathPattern system:

- `PathSegment` types (static, index, wildcard, slice, filter, recursive)
- `compilePathPattern()` parsing json-p3 query segments
- Pattern caching via `Map<string, CompiledPathPattern>`
- `match()` function for O(m) pointer matching
- `expand()` function for initial path expansion
- Concrete prefix extraction for subtree scoping
- Structural dependency identification

**Testing:**

- Compile `$.users[*].name` → [static:users, wildcard, static:name]
- Compile `$.items[0:5:2]` → [static:items, slice{0,5,2}]
- Match `/users/0/name` against `$.users[*].name` → true
- Match `/admins/0/name` against `$.users[*].name` → false (static mismatch)
- Pattern caching: same source → same instance
- `isSingular` correctly identifies static-only patterns
- Concrete prefix extracted correctly

---

### Step 6: Filter Predicate Compilation

**Files:**

- `packages/data-map/core/src/path/predicate.ts`
- `packages/data-map/core/src/path/predicate.spec.ts`
- `packages/data-map/core/src/path/compile.ts` (integrate predicates)

**What:** Implement JIT compilation of filter expressions to native JavaScript predicate functions:

- Parse filter expressions (`@.active == true`, `@.score > 90`)
- Generate JavaScript code from filter AST
- Compile to native functions via `Function` constructor
- Predicate caching by expression hash
- Support for: comparisons, logical operators, existence checks, functions (match, search, length, count)

**Testing:**

- Compile `@.active == true` → `(v) => v?.active === true`
- Compile `@.score > 90 && @.verified` → correct logical composition
- Compile `match(@.email, '.*@example.com')` → regex test
- Predicate caching: same expression → same function
- Filter predicates correctly reject/accept during match

---

### Step 7: Recursive Descent Matching

**Files:**

- `packages/data-map/core/src/path/match.ts` (extend)
- `packages/data-map/core/src/path/match.spec.ts` (extend)
- `packages/data-map/core/src/path/expand.ts` (extend)

**What:** Implement recursive descent (`$..`) pattern matching and expansion:

- `RecursiveDescentSegment` with following segments
- Recursive matching algorithm for O(m×d) worst case
- Tree traversal for expansion at any depth
- Handle complex patterns like `$..users[*].name`

**Testing:**

- Match `/name` against `$..name` → true at depth 1
- Match `/users/0/profile/name` against `$..name` → true at depth 4
- Match `/users/0/email` against `$..name` → false
- Expand `$..name` returns all `name` properties at any depth

---

### Step 8: Static Subscription System

**Files:**

- `packages/data-map/core/src/subscription/types.ts`
- `packages/data-map/core/src/subscription/manager.ts`
- `packages/data-map/core/src/subscription/manager.spec.ts`
- `packages/data-map/core/src/subscription/reverse-index.ts`
- `packages/data-map/core/src/datamap.ts` (integrate subscriptions)

**What:** Implement the subscription system for static JSON Pointer subscriptions:

- `SubscriptionManager` class
- Reverse index (`Map<pointer, Set<subscriptionId>>`)
- Subscription registration and unregistration
- Notification delivery via `queueMicrotask`
- Lifecycle hooks: `before`, `on`, `after` stages
- Cancel callback and value transformation in `before` stage
- Handler invocation order (most specific first, then registration)

**Testing:**

- Register subscription on `/users/0/name`
- Mutation at `/users/0/name` triggers callback
- `before` handler can `cancel()` to abort mutation
- `before` handler return value transforms stored value
- `after` handlers receive final committed value
- `queueMicrotask` batches notifications

---

### Step 9: Dynamic Subscription System

**Files:**

- `packages/data-map/core/src/subscription/manager.ts` (extend)
- `packages/data-map/core/src/subscription/manager.spec.ts` (extend)
- `packages/data-map/core/src/subscription/bloom.ts`
- `packages/data-map/core/src/subscription/bloom.spec.ts`

**What:** Extend subscription system for JSONPath (dynamic) subscriptions:

- Compile patterns at registration time
- Initial expansion to populate `expandedPaths`
- Pattern matching for notification
- Structural watchers for re-expansion triggers
- Bloom filter for quick rejection (optional optimization)
- Re-expansion when structural dependencies change

**Testing:**

- Subscribe to `$.users[*].name`, add user → notification for new path
- Subscribe to `$.products[?(@.active)].price` → only active products notified
- Change `active` flag → subscription re-expands, updates matches
- Bloom filter quickly rejects non-matching pointers

---

### Step 10: Batch API & Transaction Support

**Files:**

- `packages/data-map/core/src/batch/batch.ts`
- `packages/data-map/core/src/batch/batch.spec.ts`
- `packages/data-map/core/src/datamap.ts` (add batch property)

**What:** Implement the Batch API for atomic multi-mutation operations:

- `Batch` class with chainable methods
- Accumulate operations without applying
- `apply()` for atomic application
- `toPatch()` for preview
- Automatic rollback on partial failure
- Single notification batch for all changes

**Testing:**

- Chain `batch.set().set().apply()` → atomic application
- Batch failure → no partial changes applied
- `batch.toPatch()` returns accumulated operations
- Single subscription notification for batched changes

---

### Step 11: Dynamic Value Definitions

**Files:**

- `packages/data-map/core/src/definition/resolver.ts`
- `packages/data-map/core/src/definition/resolver.spec.ts`
- `packages/data-map/core/src/definition/types.ts`
- `packages/data-map/core/src/datamap.ts` (integrate definitions)

**What:** Implement dynamic value definitions (computed properties):

- Getter functions transforming stored → public value
- Setter functions transforming public → stored value
- Dependency tracking for cache invalidation
- Definition initialization ordering (topological sort)
- `readOnly` enforcement
- `defaultValue` for construction-time initialization

**Testing:**

- Getter transforms value on `get()`
- Setter transforms value on `set()`
- Dependency change invalidates computed value
- `readOnly: true` + `strict: true` throws on set
- Definitions initialize in correct dependency order
- `defaultValue` used instead of executing getter during construction

---

### Step 12: Utility API & Finalization

**Files:**

- `packages/data-map/core/src/datamap.ts` (add utility methods)
- `packages/data-map/core/src/datamap.spec.ts` (extend)
- `packages/data-map/core/README.md`
- `packages/data-map/core/src/index.ts` (finalize exports)

**What:** Implement utility methods and finalize the package:

- `equals()` for deep equality comparison
- `extends()` for structural containment check
- `toJSON()` for deterministic JSON representation
- `clone()` for deep clone with structural sharing
- `getSnapshot()` for immutable snapshot
- Comprehensive README with usage examples
- Clean public API exports

**Testing:**

- `equals()` correctly compares DataMaps and plain objects
- `toJSON()` returns the canonical data
- `clone()` creates independent copy
- `getSnapshot()` returns immutable reference
- Full integration test: construct, read, write, subscribe, batch

---

## Acceptance Criteria Summary

From the specification, the following key acceptance criteria must be validated:

| ID         | Criteria                                                                        |
| ---------- | ------------------------------------------------------------------------------- |
| AC-001     | Constructor stores initial data, accessible via `.get('')`                      |
| AC-004     | JSON Pointer `.get()` returns exact location value                              |
| AC-005     | JSONPath `.getAll()` returns all matches in deterministic order                 |
| AC-008     | Set on existing path generates `replace` operation                              |
| AC-009     | Set on non-existent path creates intermediate containers                        |
| AC-012     | Batch operations apply atomically                                               |
| AC-015-020 | Compiled patterns work correctly (singular, wildcard, filter, match)            |
| AC-021-025 | Subscriptions trigger correctly (static, dynamic, cancel, transform, re-expand) |
| AC-029-032 | Definitions work (getter, setter, deps, readOnly)                               |
| AC-033-038 | Array operations and move semantics behave correctly                            |

---

## Dependencies

| Package                          | Version       | Purpose                                           |
| -------------------------------- | ------------- | ------------------------------------------------- |
| `json-p3`                        | `^2.2.2`      | JSONPath, JSON Pointer, JSON Patch implementation |
| `@lellimecnar/eslint-config`     | `workspace:*` | Linting                                           |
| `@lellimecnar/typescript-config` | `workspace:*` | TypeScript config                                 |
| `@lellimecnar/vite-config`       | `workspace:^` | Build config                                      |
| `@lellimecnar/vitest-config`     | `workspace:*` | Test config                                       |

---

## Risk Mitigation

| Risk                            | Mitigation                                                 |
| ------------------------------- | ---------------------------------------------------------- |
| Filter predicate JIT complexity | Start with basic comparisons, add functions incrementally  |
| Recursive descent performance   | Implement caching for repeated pattern matches             |
| Re-expansion frequency          | Debounce structural changes, batch re-expansions           |
| Memory usage in large datasets  | Implement Bloom filter for quick rejection, lazy expansion |

---

## Notes

- The package follows monorepo conventions: Vite build, Vitest tests, co-located specs
- Each step is independently testable and builds on previous steps
- The compiled pattern system is the core innovation enabling efficient subscriptions
- Future adapters (React hooks, Web Workers) will be separate packages under `packages/data-map/`
