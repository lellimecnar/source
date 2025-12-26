
# Polymix: Implementation + Documentation Completion Guide

This file is the copy/paste-ready implementation guide for `packages/polymix`.

## Status (as of last verification)

- Steps 1–10: ✅ complete in repo
- Step 11 (docs): ✅ complete
- Polymix tests: ✅ 122 passed / 8 suites

Baseline verification (run from repo root):

```bash
pnpm --filter polymix test
```

---

## Guardrails

- Run all commands from repo root.
- Use pnpm workspace filtering (do not `cd packages/polymix`).
- Keep changes scoped strictly to documentation and doc-verification tests.

---

## Steps 1–10 (Already Done)

No work required; these steps are included only for traceability.

- [x] Step 1: scaffold `packages/polymix/*`
- [x] Step 2: implement core types + utilities
- [x] Step 3: implement strategies (`override`, `pipe`, `compose`, `parallel`, `race`, `merge`, `first`, `all`, `any`)
- [x] Step 4: implement `mix()` + `mixWithBase()` core
- [x] Step 5: implement decorators
- [x] Step 6: add/port tests
- [x] Step 7: initial `packages/polymix/README.md`
- [x] Step 8: `init()` lifecycle support
- [x] Step 9: robust metadata copy behavior
- [x] Step 10: ts-mixer compatibility tests

---

## Step 11: Documentation Completion (Do Now)

Step 11 is organized as 5 sub-steps. Each sub-step includes:

- A checklist
- Copy/paste-ready patches or full file contents
- A concrete verification command
- A **STOP & COMMIT** gate

### Step 11.0: Confirm Current Baseline

- [x] Confirm `polymix` builds and tests are green before touching docs.

```bash
pnpm --filter polymix build
pnpm --filter polymix test
```

#### STOP & COMMIT (11.0)

STOP & COMMIT: If baseline fails, stop and fix baseline first.

---

### Step 11.1: Add JSDoc to Public Exports

Goal: JSDoc for public, user-facing symbols (so editor IntelliSense is useful).

Files to update:

- [x] `packages/polymix/src/core.ts` (add JSDoc for `mixWithBase`; tighten `mix()` remarks)
- [x] `packages/polymix/src/utils.ts` (`from`, `hasMixin`, `when`, `EmptyMixin`)
- [x] `packages/polymix/src/types.ts` (types + `MixinMetadata`)
- [x] `packages/polymix/src/decorators.ts` (decorator exports)

#### Patch: `packages/polymix/src/core.ts`

```diff
*** Begin Patch
*** Update File: packages/polymix/src/core.ts
@@
 /**
  * The core mixin composition function.
  *
  * It intelligently handles a base class, applies mixins, resolves method conflicts
  * using strategies, and preserves `instanceof` checks and decorator metadata.
  *
+ * @remarks
+ * `mix()` uses an implicit base-class heuristic:
+ * - If the last class has constructor parameters (i.e. `Ctor.length > 0`), it is treated as the base class.
+ * - Otherwise, all provided classes are treated as mixins.
+ *
+ * When the heuristic triggers and multiple classes were provided, `polymix` logs a warning:
+ * `[polymix] Warning: The last class provided to mix() (...) has constructor parameters and is being treated as a base class. ...`
+ *
+ * Prefer {@link mixWithBase} when you want explicit base class handling.
  *
  * @param mixins - A variable number of mixin classes to combine. The last class
  *   can be a base class to extend.
  * @returns A new class that is the composition of all provided mixins.
  */
 export function mix<T extends AnyConstructor[]>(...mixins: T): MixedClass<T> {
@@
 	return mixWithBase(Base as any, ...(pureMixins as any)) as any;
 }
 
+/**
+ * Creates a new class that extends `Base` and applies `mixins`.
+ *
+ * @remarks
+ * Use this when you have an actual base class (especially one with constructor parameters)
+ * and want to avoid the implicit base-class heuristic in {@link mix}.
+ *
+ * @example
+ * ```ts
+ * class User {
+ *   constructor(readonly name: string) {}
+ * }
+ *
+ * class Timestamped {
+ *   createdAt = new Date();
+ * }
+ *
+ * class Admin extends mixWithBase(User, Timestamped) {}
+ *
+ * const admin = new Admin('Ada');
+ * admin instanceof User; // true
+ * admin.createdAt instanceof Date; // true
+ * ```
+ */
 export function mixWithBase<
 	Base extends AnyConstructor,
 	T extends AnyConstructor[],
 >(Base: Base, ...mixins: T): MixedClass<[...T, Base]> {
*** End Patch
```

#### Patch: `packages/polymix/src/utils.ts`

```diff
*** Begin Patch
*** Update File: packages/polymix/src/utils.ts
@@
 export function from<T extends AnyConstructor>(
 	instance: any,
 	Mixin: T,
 ): InstanceType<T> {
@@
 }
 
+/**
+ * Returns a view of `instance` as-if it were an instance of `Mixin`.
+ *
+ * @remarks
+ * This is useful when two mixins provide conflicting method names and you want
+ * to call a specific mixin's implementation.
+ */
 export function from<T extends AnyConstructor>(
 	instance: any,
 	Mixin: T,
 ): InstanceType<T> {
@@
 }
 
+/**
+ * Type guard for `instanceof Mixin`.
+ */
 export function hasMixin<T extends AnyConstructor>(
 	instance: unknown,
 	Mixin: T,
 ): instance is InstanceType<T> {
 	return instance instanceof Mixin;
 }
 
+/**
+ * Placeholder mixin returned by {@link when} when `condition` is false.
+ */
 export class EmptyMixin {
 	// Intentionally empty - used as placeholder for disabled mixins
 }
 
+/**
+ * Conditionally include a mixin.
+
+ * @example
+ * ```ts
+ * const DebuggableDevice = mix(when(process.env.NODE_ENV !== 'production', Debuggable))
+ * ```
+ */
 export function when<T extends AnyConstructor>(
 	condition: boolean,
 	Mixin: T,
 ): T | typeof EmptyMixin {
 	return condition ? Mixin : EmptyMixin;
 }
*** End Patch
```

Note: The patch above intentionally adds only JSDoc; do not change runtime behavior.

#### Patch: `packages/polymix/src/types.ts`

```diff
*** Begin Patch
*** Update File: packages/polymix/src/types.ts
@@
-export type Constructor<T = object> = new (...args: any[]) => T;
-export type AbstractConstructor<T = object> = abstract new (
-	...args: any[]
-) => T;
-export type AnyConstructor<T = object> =
-	| Constructor<T>
-	| AbstractConstructor<T>;
+/** Standard (concrete) constructor type. */
+export type Constructor<T = object> = new (...args: any[]) => T;
+
+/** Abstract constructor type. */
+export type AbstractConstructor<T = object> = abstract new (
+	...args: any[]
+) => T;
+
+/** Union of concrete and abstract constructor types used by polymix. */
+export type AnyConstructor<T = object> =
+	| Constructor<T>
+	| AbstractConstructor<T>;
 
 // Merge instance types from all mixins (variadic - no limit!)
 export type UnionToIntersection<U> = (
 	U extends any ? (k: U) => void : never
 ) extends (k: infer I) => void
 	? I
 	: never;
@@
 export type MixedClass<T extends AnyConstructor[]> = Constructor<
 	MixedInstance<T>
 > &
 	Omit<MixedStatic<T>, 'prototype'>;
 
+/** Internal metadata tracked per mixin constructor. */
 export interface MixinMetadata {
 	isAbstract: boolean;
 	strategies: Map<string | symbol, any>;
 	decoratorMetadata: Map<string | symbol, any[]>;
 }
*** End Patch
```

#### Patch: `packages/polymix/src/decorators.ts`

Add JSDoc blocks to each exported decorator so IntelliSense explains usage.

```diff
*** Begin Patch
*** Update File: packages/polymix/src/decorators.ts
@@
-export function mixin<T extends AnyConstructor[]>(...mixins: T) {
+/**
+ * Class decorator that applies one or more mixins to an existing class.
+ *
+ * @example
+ * ```ts
+ * @mixin(Timestamped, Identifiable)
+ * class User {}
+ * ```
+ */
+export function mixin<T extends AnyConstructor[]>(...mixins: T) {
@@
-export function Use<T extends AnyConstructor[]>(...mixins: T) {
+/** Alias for {@link mixin}. */
+export function Use<T extends AnyConstructor[]>(...mixins: T) {
@@
-export function abstract<T extends AnyConstructor>(Target: T): T {
+/** Marks a mixin as abstract so it is not instantiated during construction. */
+export function abstract<T extends AnyConstructor>(Target: T): T {
@@
-export function delegate<T extends AnyConstructor>(Delegate: T) {
+/**
+ * Delegates methods to an instance property.
+
+ * @example
+ * ```ts
+ * class Service { doWork() {} }
+ *
+ * class Worker {
+ *   service = new Service()
+ *
+ *   @delegate(Service)
+ *   doWork!: Service['doWork']
+ * }
+ * ```
+ */
+export function delegate<T extends AnyConstructor>(Delegate: T) {
*** End Patch
```

Continue in the same file by adding short JSDoc one-liners above each strategy decorator export (`override`, `pipe`, `compose`, `parallel`, `race`, `merge`, `first`, `all`, `any`).

#### Verification (11.1)

```bash
pnpm --filter polymix build
pnpm --filter polymix test
```

#### STOP & COMMIT (11.1)

STOP & COMMIT: Stage and commit JSDoc changes only.

---

### Step 11.2: Document the Base-Class Heuristic + Warning

- [x] Add a "Base Class Handling" section to `packages/polymix/README.md`.
- [x] Document the heuristic exactly (last class treated as base iff `Ctor.length > 0`).
- [x] Mention the warning and provide the explicit alternative (`mixWithBase`).

#### Patch: `packages/polymix/README.md`

Add this section (placement: near the API docs for `mix` / `mixWithBase`):

```markdown
## Base Class Handling

### `mix()` implicit base-class heuristic

`mix()` treats the **last** class as a base class **only if it has constructor parameters** (i.e. `Ctor.length > 0`).

If the heuristic triggers and you passed multiple classes, polymix logs a warning:

```text
[polymix] Warning: The last class provided to mix() (Base) has constructor parameters and is being treated as a base class. If this is intended to be a mixin, please ensure it has a zero-argument constructor.
```

Examples:

```ts
// All are treated as mixins (no constructor params)
class Example1 extends mix(MixinA, MixinB) {}

class Base {
  constructor(readonly name: string) {}
}

// Base has constructor params → treated as base class
class Example2 extends mix(MixinA, Base) {
  constructor(name: string) {
    super(name)
  }
}
```

### `mixWithBase()` explicit base class

Prefer `mixWithBase()` when you want explicit, unambiguous base-class behavior:

```ts
class Example extends mixWithBase(Base, MixinA, MixinB) {}
```
```

#### Verification (11.2)

```bash
pnpm --filter polymix test
```

#### STOP & COMMIT (11.2)

STOP & COMMIT: Stage and commit README updates only.

---

### Step 11.3: Add `MIGRATION.md` (ts-mixer → polymix)

- [x] Create `packages/polymix/MIGRATION.md` with side-by-side examples.
- [x] Make it explicit which patterns are "same", "different", and "not supported".

#### New file: `packages/polymix/MIGRATION.md`

```markdown
# Migrating from ts-mixer to polymix

This guide helps you migrate from `ts-mixer` to `polymix`.

## Executive summary

- If you currently use `Mixin(A, B)` (no base class), migrating to `mix(A, B)` is usually direct.
- If you mix a base class, prefer `mixWithBase(Base, A, B)` for clarity.
- `polymix` calls each mixin’s `init(...args)` automatically (ts-mixer-compatible), without a shared `settings` object.

## API mapping

| ts-mixer                         | polymix                   | Notes               |
| -------------------------------- | ------------------------- | ------------------- |
| `Mixin(A, B)`                    | `mix(A, B)`               | Similar behavior    |
| `Mixin(Base, A, B)`              | `mixWithBase(Base, A, B)` | Explicit base class |
| `settings.initFunction = 'init'` | built-in                  | No settings needed  |

## Base class handling

ts-mixer commonly treats the first argument as a base class when you include one.

polymix has two supported patterns:

```ts
// Explicit base class (recommended)
class User extends mixWithBase(BaseEntity, Timestamped, Auditable) {}

// Implicit base class via mix() heuristic (last class is base iff it has ctor params)
class User2 extends mix(Timestamped, BaseEntity) {}
```

If you rely on a class being a mixin even though it has constructor parameters, ensure it has a zero-argument constructor or use `mixWithBase()`.

## `init()` lifecycle

polymix calls each mixin’s `init(...args)` after construction.

```ts
class Timestamped {
  init() {
    // called automatically
  }
}
```

## What polymix does not support

polymix does not expose a `settings` API like ts-mixer.

If you rely on ts-mixer proxy strategies or other settings-driven behavior, you must refactor to polymix’s fixed “copy” composition approach.
```

#### Verification (11.3)

```bash
pnpm --filter polymix test
```

#### STOP & COMMIT (11.3)

STOP & COMMIT: Stage and commit `MIGRATION.md` only.

---

### Step 11.4: Document Compatibility Boundaries in README

- [x] Add a "Compatibility" section to `packages/polymix/README.md`.
- [x] Clearly list what's compatible and what's not.

#### Patch: `packages/polymix/README.md`

Add this section near the bottom:

```markdown
## Compatibility

polymix is designed to be ts-mixer-friendly, but it is not a 100% drop-in replacement.

### Works well

- `mix(A, B, C)` for composing mixins
- `mixWithBase(Base, A, B)` for explicit base classes
- `instanceof` checks via `Symbol.hasInstance`
- `init(...args)` lifecycle support

### Differences

- polymix has no `settings` object
- `mix()` has an implicit base-class heuristic (see “Base Class Handling”)
- `init()` is called per-mixin; there is no shared `super.init()` chain
```

#### Verification (11.4)

```bash
pnpm --filter polymix test
```

#### STOP & COMMIT (11.4)

STOP & COMMIT: Stage and commit README compatibility section only.

---

### Step 11.5: Verify README Examples via Tests

- [x] Add a dedicated test file: `packages/polymix/src/__tests__/readme-examples.spec.ts`.
- [x] Ensure examples compile and assertions match actual runtime behavior.
- [x] When testing the base-class heuristic, stub `console.warn` so the suite stays clean.

#### New file: `packages/polymix/src/__tests__/readme-examples.spec.ts`

```ts
import { from, hasMixin, mix, mixWithBase, when } from '..';

describe('README examples', () => {
	it('Quick Start composition works', () => {
		class Identifiable {
			id = '123';
		}

		class Timestamped {
			createdAt = new Date();
		}

		class User extends mix(Identifiable, Timestamped) {
			constructor(readonly name: string) {
				super();
			}
		}

		const user = new User('Alice');
		expect(user.id).toBe('123');
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user instanceof Identifiable).toBe(true);
		expect(user instanceof Timestamped).toBe(true);
		expect(user instanceof User).toBe(true);
	});

	it('hasMixin narrows types', () => {
		class Timestamped {
			updatedAt = new Date();
			touch() {
				this.updatedAt = new Date();
			}
		}

		const Entity = mix(Timestamped);
		const entity = new Entity();

		if (!hasMixin(entity, Timestamped)) {
			throw new Error('expected entity to have Timestamped mixin');
		}

		entity.touch();
		expect(entity.updatedAt).toBeInstanceOf(Date);
	});

	it('from() targets a specific mixin implementation', () => {
		class Fish {
			move() {
				return 'swimming';
			}
		}
		class Bird {
			move() {
				return 'flying';
			}
		}

		class FlyingFish extends mix(Fish, Bird) {
			moveInWater() {
				return from(this, Fish).move();
			}
			moveInAir() {
				return from(this, Bird).move();
			}
		}

		const ff = new FlyingFish();
		expect(ff.moveInWater()).toBe('swimming');
		expect(ff.moveInAir()).toBe('flying');
	});

	it('when() conditionally includes a mixin', () => {
		class Debuggable {
			debug = true;
		}

		const DevDevice = mix(when(true, Debuggable));
		const ProdDevice = mix(when(false, Debuggable));

		expect(hasMixin(new DevDevice(), Debuggable)).toBe(true);
		expect(hasMixin(new ProdDevice(), Debuggable)).toBe(false);
	});

	it('mixWithBase is explicit and avoids heuristic warning', () => {
		class Base {
			constructor(readonly name: string) {}
		}
		class Extra {
			extra = true;
		}

		class Thing extends mixWithBase(Base, Extra) {
			constructor(name: string) {
				super(name);
			}
		}

		const t = new Thing('x');
		expect(t.name).toBe('x');
		expect(t.extra).toBe(true);
		expect(t instanceof Base).toBe(true);
	});

	it('mix() heuristic warns when last class has constructor params', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			class MixinA {
				a = true;
			}
			class Base {
				constructor(readonly name: string) {}
			}

			class Thing extends mix(MixinA, Base) {
				constructor(name: string) {
					super(name);
				}
			}

			const t = new Thing('x');
			expect(t.a).toBe(true);
			expect(t.name).toBe('x');
			expect(warn).toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});
```

#### Verification (11.5)

```bash
pnpm --filter polymix test -- --testPathPattern=readme-examples
pnpm --filter polymix test
```

#### STOP & COMMIT (11.5)

STOP & COMMIT: Stage and commit the README example tests.

---

## Step 11 Final Verification

- [x] `pnpm --filter polymix build`
- [x] `pnpm --filter polymix test`

---

## Useful Commands

```bash
pnpm --filter polymix build
pnpm --filter polymix test
pnpm --filter polymix test -- --watch
```
