# Polymix Unified Implementation Plan

## Goal
Complete implementation of the `polymix` TypeScript mixin library with full documentation, ts-mixer compatibility, and production-ready quality. This unified plan consolidates all work from `polymix-implementation` and `polymix-improvements` into a single comprehensive implementation guide.

## Current Status
- **Implementation:** 100% Complete (Steps 1-10)
- **Tests:** 77 passing across 7 test files
- **Documentation:** 60% Complete (remaining work in Step 11)
- **Branch:** `feat/polymix-implementation`

---

## Prerequisites

Ensure you are on the correct branch before beginning:

```bash
git checkout feat/polymix-implementation
```

If the branch doesn't exist, create it from main:
```bash
git checkout -b feat/polymix-implementation main
```

---

## Implementation Steps

### Step 1: Scaffold Package Structure ✅ COMPLETE

**Files Created:**
- [x] `packages/polymix/package.json`
- [x] `packages/polymix/tsconfig.json`
- [x] `packages/polymix/tsconfig.build.json`
- [x] `packages/polymix/.eslintrc.js`
- [x] `packages/polymix/jest.config.js`
- [x] `packages/polymix/src/index.ts`

**Verification:**
```bash
pnpm install
pnpm --filter polymix build
```

---

### Step 2: Implement Core Types and Utilities ✅ COMPLETE

**Files Created:**
- [x] `packages/polymix/src/types.ts` - Core type definitions
- [x] `packages/polymix/src/utils.ts` - Utility functions

**What's Implemented:**
- `Constructor<T>`, `AbstractConstructor<T>`, `AnyConstructor<T>` types
- `MixedClass<T>`, `MixedInstance<T>`, `MixedStatic<T>` variadic generics
- `MIXIN_REGISTRY` and `MIXIN_METADATA` WeakMaps
- `installInstanceCheck()` for `Symbol.hasInstance` support
- `copyDecoratorMetadata()` for `Symbol.metadata` and `reflect-metadata`
- `from()`, `hasMixin()`, `when()` utility functions

**Verification:**
```bash
pnpm --filter polymix build
pnpm --filter polymix test
```

---

### Step 3: Implement Composition Strategies ✅ COMPLETE

**Files Created:**
- [x] `packages/polymix/src/strategies.ts` - 9 composition strategies
- [x] `packages/polymix/src/strategies.spec.ts` - 14 tests

**Strategies Implemented:**
| Strategy   | Behavior                             | Return Type        |
| ---------- | ------------------------------------ | ------------------ |
| `override` | Calls all; last result returned      | Single value       |
| `pipe`     | Output becomes input of next         | Final output       |
| `compose`  | Like pipe, reverse order             | Final output       |
| `parallel` | Run all concurrently                 | `Promise<T[]>`     |
| `race`     | First to resolve wins                | `Promise<T>`       |
| `merge`    | Deep merge objects/concat arrays     | Merged result      |
| `first`    | First non-undefined result           | Single value       |
| `all`      | All must return truthy               | `Promise<boolean>` |
| `any`      | At least one truthy                  | `Promise<boolean>` |

**Verification:**
```bash
pnpm --filter polymix test -- --testPathPattern=strategies
```

---

### Step 4: Implement Core Mixin Logic ✅ COMPLETE

**Files Created:**
- [x] `packages/polymix/src/core.ts` - `mix()` and `mixWithBase()` functions
- [x] `packages/polymix/src/core.spec.ts` - 42+ comprehensive tests

**What's Implemented:**
- `mix(...mixins)` - Automatic base class heuristic
- `mixWithBase(Base, ...mixins)` - Explicit base class
- Prototype composition (methods + accessors)
- Static property/method copying (including symbols)
- Method conflict resolution via `applyStrategy()`
- `instanceof` support via `Symbol.hasInstance`
- Error-resilient constructor initialization

**Verification:**
```bash
pnpm --filter polymix test -- --testPathPattern=core
```

---

### Step 5: Implement Decorators ✅ COMPLETE

**Files Created:**
- [x] `packages/polymix/src/decorators.ts` - All decorators
- [x] `packages/polymix/src/decorators.spec.ts` - 19+ tests

**Decorators Implemented:**
- `@mixin(...mixins)` / `@Use(...)` - Apply mixins to existing class
- `@abstract` - Mark mixin as abstract (not instantiated)
- `@delegate(Delegate)` - Delegate methods to property
- Strategy decorators: `@override`, `@pipe`, `@compose`, `@parallel`, `@race`, `@merge`, `@first`, `@all`, `@any`

**Verification:**
```bash
pnpm --filter polymix test -- --testPathPattern=decorators
```

---

### Step 6: Migrate Tests and Cleanup ✅ COMPLETE

**Files Created:**
- [x] `packages/polymix/src/__tests__/polymix.spec.ts` - 6 integration tests
- [x] `packages/polymix/src/__tests__/compatibility.spec.ts` - 3 ts-mixer compatibility tests
- [x] `packages/polymix/src/__tests__/lifecycle.spec.ts` - 3 init lifecycle tests
- [x] `packages/polymix/src/__tests__/robustness.spec.ts` - 1 edge case test

**Test Coverage Summary:**
```
Total Tests: 77 passing
Test Files: 7
- core.spec.ts: 42+ tests
- strategies.spec.ts: 14 tests
- decorators.spec.ts: 19+ tests
- polymix.spec.ts: 6 tests
- compatibility.spec.ts: 3 tests
- lifecycle.spec.ts: 3 tests
- robustness.spec.ts: 1 test
```

**Verification:**
```bash
pnpm --filter polymix test
```

---

### Step 7: Basic Documentation ✅ COMPLETE

**Files Created:**
- [x] `packages/polymix/README.md` - Basic documentation

**What Exists:**
- Features list
- Installation instructions
- Quick Start example
- API Reference (mix, mixWithBase, hasMixin, from, when)
- Decorator documentation
- Composition strategies table
- TypeScript support section
- Comparison table vs ts-mixer

**Verification:**
- [x] README renders correctly in GitHub
- [x] All tests pass

---

### Step 8: Implement `init` Lifecycle Support ✅ COMPLETE
**(From polymix-improvements)**

**Files Modified:**
- [x] `packages/polymix/src/core.ts` - Added `init()` lifecycle invocation

**What's Implemented:**
- Each mixin's `init(...args)` method is called after construction
- Constructor arguments are passed to `init()`
- Works with mixins that don't have `init()` (graceful skip)

**Code (already in core.ts):**
```typescript
// In mixWithBase constructor:
for (const Mixin of pureMixins) {
  // ... existing code ...
  
  // Call init method if it exists (ts-mixer compatibility)
  const initMethod = Mixin.prototype.init;
  if (typeof initMethod === 'function') {
    initMethod.apply(this, args);
  }
}
```

**Verification:**
```bash
pnpm --filter polymix test -- --testPathPattern=lifecycle
```

---

### Step 9: Robust Metadata Discovery ✅ COMPLETE
**(From polymix-improvements)**

**Files Modified:**
- [x] `packages/polymix/src/utils.ts` - Improved `copyDecoratorMetadata()`

**What's Implemented:**
- Metadata discovery uses instantiation fallback with try/catch
- Tolerates mixins that cannot be instantiated (constructors with required args)
- Tolerates constructors that throw
- Prototype composition succeeds even when constructor fails

**Verification:**
```bash
pnpm --filter polymix test -- --testPathPattern=robustness
```

---

### Step 10: TS-Mixer Compatibility Tests ✅ COMPLETE
**(From polymix-improvements)**

**Files Created:**
- [x] `packages/polymix/src/__tests__/compatibility.spec.ts`

**Patterns Tested:**
1. `Mix(MixinA, MixinB)` - Multiple mixins (✅ works)
2. `Mix(Base, Mixin)` - Base class mixing (✅ works with `mixWithBase`)
3. `init()` lifecycle (✅ works)

**Verification:**
```bash
pnpm --filter polymix test -- --testPathPattern=compatibility
```

---

### Step 11: Complete Documentation ⚠️ PENDING

**Remaining Tasks:**

#### 11.1 Add JSDoc Comments to Public APIs
- [ ] Add JSDoc to `mix()` function
- [ ] Add JSDoc to `mixWithBase()` function
- [ ] Add JSDoc to `hasMixin()` function
- [ ] Add JSDoc to `from()` function
- [ ] Add JSDoc to `when()` function
- [ ] Add JSDoc to all decorators
- [ ] Add JSDoc to all exported types

**Example JSDoc to add to `packages/polymix/src/core.ts`:**

```typescript
/**
 * Creates a new class that composes all provided mixin classes.
 * 
 * The resulting class will:
 * - Have all properties and methods from all mixins
 * - Pass `instanceof` checks for all mixins via `Symbol.hasInstance`
 * - Copy static properties and methods from all mixins
 * - Inherit decorator metadata from all mixins
 * 
 * @example
 * ```typescript
 * class Dragon extends mix(Flyer, FireBreather, Reptile) {
 *   name = "Smaug";
 * }
 * 
 * const dragon = new Dragon();
 * dragon instanceof Flyer; // true
 * ```
 * 
 * @remarks
 * If the last class has constructor parameters, it is treated as a base class.
 * For explicit base class handling, use {@link mixWithBase} instead.
 * 
 * @param mixins - Variable number of mixin classes to compose
 * @returns A new class that is the composition of all provided mixins
 * @see {@link mixWithBase} for explicit base class handling
 */
export function mix<T extends AnyConstructor[]>(...mixins: T): MixedClass<T> {
  // ... existing implementation
}

/**
 * Creates a new class that extends a base class and applies mixins.
 * 
 * Unlike {@link mix}, this function explicitly specifies which class
 * should be the base class (first argument).
 * 
 * @example
 * ```typescript
 * class Admin extends mixWithBase(User, Permissions, AuditLog) {
 *   // User is the base class, Permissions and AuditLog are mixins
 * }
 * ```
 * 
 * @param Base - The base class to extend
 * @param mixins - Variable number of mixin classes to apply
 * @returns A new class extending Base with all mixins applied
 */
export function mixWithBase<Base extends AnyConstructor, T extends AnyConstructor[]>(
  Base: Base,
  ...mixins: T
): MixedClass<[...T, Base]> {
  // ... existing implementation
}
```

**Verification:**
```bash
pnpm --filter polymix build
# Check IDE autocomplete shows JSDoc comments
```

#### 11.2 Document Base Class Heuristic Behavior
- [ ] Add "Base Class Handling" section to README
- [ ] Explain implicit base class detection
- [ ] Provide examples of when to use `mix()` vs `mixWithBase()`

**Content to add to `packages/polymix/README.md`:**

```markdown
## Base Class Handling

### Implicit Base Class Detection (`mix()`)

When using `mix()`, the last class is treated as a base class **only if it has constructor parameters**:

```typescript
// MixinA and MixinB have no constructor params → all are mixins
class Example1 extends mix(MixinA, MixinB) {}

// Base has constructor params → Base is treated as the base class
class Base {
  constructor(public name: string) {}
}
class Example2 extends mix(MixinA, Base) {
  constructor(name: string) {
    super(name); // Calls Base constructor
  }
}
```

A warning is logged when the implicit base class heuristic is triggered.

### Explicit Base Class (`mixWithBase()`)

For clarity, use `mixWithBase()` to explicitly specify the base class:

```typescript
// Base is always the base class, regardless of constructor signature
class Admin extends mixWithBase(User, Permissions, AuditLog) {
  // User is the base class (first argument)
  // Permissions and AuditLog are mixins
}
```

**When to use which:**
| Scenario | Recommended API |
|----------|----------------|
| All classes are mixins (no base) | `mix(A, B, C)` |
| Extending an existing class | `mixWithBase(Base, A, B)` |
| Base class has constructor params | `mixWithBase(Base, A, B)` |
| Avoiding implicit behavior | `mixWithBase(...)` |
```

#### 11.3 Create TS-Mixer Migration Guide
- [ ] Create `packages/polymix/MIGRATION.md`
- [ ] Document API differences
- [ ] Provide side-by-side comparison
- [ ] Add @card-stack/core migration example

**Create `packages/polymix/MIGRATION.md`:**

```markdown
# Migrating from ts-mixer to polymix

This guide helps you migrate from `ts-mixer` to `polymix`.

## Quick Start

1. Install polymix:
   ```bash
   pnpm add polymix
   ```

2. Update imports:
   ```typescript
   // Before (ts-mixer)
   import { Mixin as Mix, settings } from 'ts-mixer';
   
   // After (polymix)
   import { mix, mixWithBase } from 'polymix';
   ```

3. Update mixin patterns (see below)

## API Comparison

| ts-mixer | polymix | Notes |
|----------|---------|-------|
| `Mixin(A, B)` | `mix(A, B)` | Identical behavior |
| `Mixin(Base, A, B)` | `mixWithBase(Base, A, B)` | Base class first in both |
| `settings.initFunction = 'init'` | Built-in | No configuration needed |
| `settings.prototypeStrategy` | Not configurable | Always uses 'copy' |
| `hasMixin(obj, Mixin)` | `hasMixin(obj, Mixin)` | Identical |
| `decorate(...)` | `@mixin(...)` | Decorator syntax |

## Base Class Ordering

**ts-mixer**: Base class is FIRST
```typescript
class User extends Mixin(BaseEntity, Timestamped) {}
```

**polymix**: Same pattern with `mixWithBase`
```typescript
class User extends mixWithBase(BaseEntity, Timestamped) {}
```

**polymix with implicit base**: Base class is LAST (when it has constructor params)
```typescript
class User extends mix(Timestamped, BaseEntity) {}
// Warning: Implicit base class detection triggered
```

## `init()` Lifecycle Differences

**ts-mixer**: Supports `super.init()` chaining
```typescript
class A {
  init() {
    super.init?.(); // Chain to parent
    console.log('A init');
  }
}
```

**polymix**: Calls each mixin's `init()` directly (no chaining)
```typescript
class A {
  init() {
    // No super.init() - each mixin's init is called automatically
    console.log('A init');
  }
}
```

## @card-stack/core Migration Example

**Before (ts-mixer):**
```typescript
// card-stack/core/src/utils.ts
export { Mixin as Mix, mix } from 'ts-mixer';
import { settings } from 'ts-mixer';

settings.initFunction = 'init';
settings.prototypeStrategy = 'copy';
settings.staticsStrategy = 'copy';
settings.decoratorInheritance = 'deep';

// Usage
class Card extends Mix(Indexable, Parentable) {}
class TestPlayer extends Mix(Player, Scoreable) {}
```

**After (polymix):**
```typescript
// card-stack/core/src/utils.ts
export { mix as Mix, mix, mixWithBase } from 'polymix';
// No settings configuration needed - init() is built-in

// Usage - identical!
class Card extends Mix(Indexable, Parentable) {}
class TestPlayer extends Mix(Player, Scoreable) {}
```

## Migration Checklist

- [ ] Install polymix: `pnpm add polymix`
- [ ] Update imports from `ts-mixer` to `polymix`
- [ ] Replace `Mixin` with `mix` or `mixWithBase`
- [ ] Remove `settings` configuration (init is built-in)
- [ ] Test `instanceof` checks (should work automatically)
- [ ] Verify `init()` methods are called correctly
- [ ] Run full test suite
```

#### 11.4 Document Compatibility Boundaries
- [ ] Add "Compatibility" section to README
- [ ] Explain "drop-in replacement" limitations
- [ ] List what is NOT compatible

**Content to add to `packages/polymix/README.md`:**

```markdown
## Compatibility with ts-mixer

polymix is designed to be largely compatible with ts-mixer, but there are differences:

### ✅ What Works
- `mix(A, B, C)` pattern
- `mixWithBase(Base, A, B)` pattern
- `instanceof` checks (improved!)
- `hasMixin()` type guard
- `init()` lifecycle methods
- Decorator metadata inheritance

### ⚠️ Differences
| Feature | ts-mixer | polymix |
|---------|----------|---------|
| Base class ordering | First argument | First argument with `mixWithBase`, last with `mix` (if has params) |
| `init()` chaining | `super.init()` supported | Each `init()` called independently |
| Settings object | Configurable | Not configurable |
| Max mixins | 10 | Unlimited |

### ❌ Not Supported
- `settings.prototypeStrategy = 'proxy'` (polymix always copies)
- `settings.staticsStrategy = 'proxy'` (polymix always copies)
- `super.init()` chaining pattern
```

#### 11.5 Verify README Examples
- [ ] Add all README examples to test suite
- [ ] Ensure examples compile and run correctly

**Create `packages/polymix/src/__tests__/readme-examples.spec.ts`:**

```typescript
import { mix, mixWithBase, hasMixin, from, when, mixin } from '..';

describe('README Examples', () => {
  describe('Quick Start', () => {
    it('should work as documented', () => {
      class Identifiable {
        id = '123';
      }

      class Timestamped {
        createdAt = new Date();
      }

      class User extends mix(Identifiable, Timestamped) {
        name: string;
        constructor(name: string) {
          super();
          this.name = name;
        }
      }

      const user = new User('Alice');

      expect(user.id).toBe('123');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user instanceof Identifiable).toBe(true);
      expect(user instanceof Timestamped).toBe(true);
      expect(user instanceof User).toBe(true);
    });
  });

  describe('hasMixin', () => {
    it('should work as documented', () => {
      class Timestamped {
        updatedAt = new Date();
        touch() {
          this.updatedAt = new Date();
        }
      }

      const entity = new (mix(Timestamped))();

      if (hasMixin(entity, Timestamped)) {
        entity.touch();
        expect(entity.updatedAt).toBeInstanceOf(Date);
      } else {
        fail('hasMixin should return true');
      }
    });
  });

  describe('from()', () => {
    it('should work as documented', () => {
      class Fish {
        move() { return 'swimming'; }
      }
      class Bird {
        move() { return 'flying'; }
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
  });

  describe('when()', () => {
    it('should work as documented', () => {
      class Debuggable {
        debug = true;
      }

      const DevDevice = mix(when(true, Debuggable));
      const ProdDevice = mix(when(false, Debuggable));

      expect(hasMixin(new DevDevice(), Debuggable)).toBe(true);
      expect(hasMixin(new ProdDevice(), Debuggable)).toBe(false);
    });
  });

  describe('mixWithBase()', () => {
    it('should work as documented', () => {
      class User {
        email = 'user@example.com';
      }
      class Permissions {
        canEdit = true;
      }
      class AuditLog {
        logs: string[] = [];
      }

      class Admin extends mixWithBase(User, Permissions, AuditLog) {}

      const admin = new Admin();
      expect(admin.email).toBe('user@example.com');
      expect(admin.canEdit).toBe(true);
      expect(admin.logs).toEqual([]);
      expect(admin instanceof User).toBe(true);
    });
  });
});
```

**Verification:**
```bash
pnpm --filter polymix test -- --testPathPattern=readme-examples
```

---

### Step 11 Verification Checklist
- [ ] All JSDoc comments added to public APIs
- [ ] Base class handling documented in README
- [ ] `MIGRATION.md` created with ts-mixer comparison
- [ ] Compatibility boundaries documented
- [ ] All README examples verified in test suite
- [ ] All tests pass: `pnpm --filter polymix test`
- [ ] Package builds: `pnpm --filter polymix build`

#### Step 11 STOP & COMMIT
**STOP & COMMIT:** Stop here and let the user test, stage, and commit documentation changes.

---

## Summary

### Completed Steps (1-10)
| Step | Description | Status |
|------|-------------|--------|
| 1 | Scaffold Package Structure | ✅ Complete |
| 2 | Core Types and Utilities | ✅ Complete |
| 3 | Composition Strategies | ✅ Complete |
| 4 | Core Mixin Logic | ✅ Complete |
| 5 | Decorators | ✅ Complete |
| 6 | Tests and Cleanup | ✅ Complete |
| 7 | Basic Documentation | ✅ Complete |
| 8 | `init` Lifecycle (from polymix-improvements) | ✅ Complete |
| 9 | Robust Metadata (from polymix-improvements) | ✅ Complete |
| 10 | TS-Mixer Compatibility Tests (from polymix-improvements) | ✅ Complete |

### Remaining Work (Step 11)
| Task | Priority | Effort |
|------|----------|--------|
| Add JSDoc to public APIs | HIGH | 2-4 hours |
| Document base class heuristic | HIGH | 30 min |
| Create ts-mixer migration guide | MEDIUM | 2-3 hours |
| Document compatibility boundaries | MEDIUM | 1 hour |
| Verify README examples in tests | MEDIUM | 1 hour |

### Future Enhancements (v2.0 - Deferred)
- `@onMix` / `@onConstruct` lifecycle hooks
- Compile-time conflict detection
- Symbol-based mixin access (`this[Fish].move()`)
- Lazy prototype resolution optimization

---

## Test Commands

```bash
# Run all tests
pnpm --filter polymix test

# Run specific test suites
pnpm --filter polymix test -- --testPathPattern=core
pnpm --filter polymix test -- --testPathPattern=strategies
pnpm --filter polymix test -- --testPathPattern=decorators
pnpm --filter polymix test -- --testPathPattern=lifecycle
pnpm --filter polymix test -- --testPathPattern=compatibility
pnpm --filter polymix test -- --testPathPattern=robustness

# Build package
pnpm --filter polymix build

# Watch mode
pnpm --filter polymix test -- --watch
```

---

## Files Reference

### Source Files
- `packages/polymix/src/index.ts` - Main exports
- `packages/polymix/src/types.ts` - Type definitions
- `packages/polymix/src/utils.ts` - Utility functions
- `packages/polymix/src/strategies.ts` - Composition strategies
- `packages/polymix/src/core.ts` - `mix()` and `mixWithBase()`
- `packages/polymix/src/decorators.ts` - All decorators

### Test Files
- `packages/polymix/src/core.spec.ts` - Core API tests
- `packages/polymix/src/strategies.spec.ts` - Strategy tests
- `packages/polymix/src/decorators.spec.ts` - Decorator tests
- `packages/polymix/src/__tests__/polymix.spec.ts` - Integration tests
- `packages/polymix/src/__tests__/compatibility.spec.ts` - ts-mixer compatibility
- `packages/polymix/src/__tests__/lifecycle.spec.ts` - init() lifecycle
- `packages/polymix/src/__tests__/robustness.spec.ts` - Edge cases

### Documentation Files
- `packages/polymix/README.md` - Main documentation
- `packages/polymix/MIGRATION.md` - ts-mixer migration guide (to create)
