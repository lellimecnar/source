# Migrating from ts-mixer to polymix

This guide helps you migrate from `ts-mixer` to `polymix`.

## Executive summary

- If you currently use `Mixin(A, B)` (no base class), migrating to `mix(A, B)` is usually direct.
- If you mix a base class, prefer `mixWithBase(Base, A, B)` for clarity.
- `polymix` calls each mixin's `init(...args)` automatically (ts-mixer-compatible), without a shared `settings` object.

## API mapping

| ts-mixer                         | polymix                   | Notes               |
| -------------------------------- | ------------------------- | ------------------- |
| `Mixin(A, B)`                    | `mix(A, B)`               | Similar behavior    |
| `Mixin(Base, A, B)`              | `mixWithBase(Base, A, B)` | Explicit base class |
| `settings.initFunction = 'init'` | built-in                  | No settings needed  |

## Base class handling

ts-mixer commonly treats the first argument as a base class when you include one.

polymix has two supported patterns:

```typescript
// Explicit base class (recommended)
class User extends mixWithBase(BaseEntity, Timestamped, Auditable) {}

// Implicit base class via mix() heuristic (last class is base iff it has ctor params)
class User2 extends mix(Timestamped, BaseEntity) {}
```

If you rely on a class being a mixin even though it has constructor parameters, ensure it has a zero-argument constructor or use `mixWithBase()`.

## `init()` lifecycle

polymix calls each mixin's `init(...args)` after construction.

```typescript
class Timestamped {
  init() {
    // called automatically
  }
}
```

## What polymix does not support

polymix does not expose a `settings` API like ts-mixer.

If you rely on ts-mixer proxy strategies or other settings-driven behavior, you must refactor to polymix's fixed "copy" composition approach.
