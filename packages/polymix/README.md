# polymix

Next-Generation TypeScript Mixins — combining the best of `ts-mixer`, `typescript-mix`, and `polytype` while eliminating their fundamental limitations.

## Features

- **True `instanceof` support**: Mixed instances pass `instanceof` checks for all mixin classes via `Symbol.hasInstance`
- **Type-safe**: Full TypeScript support with type inference for mixed methods and properties
- **No mixin limit**: Mix as many classes as needed (variadic generics)
- **Composition Strategies**: Control *how* methods merge with 9 built-in strategies
- **Decorators**: Easy-to-use decorators for applying mixins and strategies
- **Decorator metadata inheritance**: Automatic support for `Symbol.metadata` and `reflect-metadata`
- **Zero dependencies**: Lightweight with optional `reflect-metadata` peer dependency

## Installation

```bash
pnpm add polymix
# or
npm install polymix
```

For decorator metadata support (optional):
```bash
pnpm add reflect-metadata
```

## Quick Start

```typescript
import { mix } from 'polymix';

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

console.log(user.id);                        // '123'
console.log(user.createdAt);                 // Date object
console.log(user instanceof Identifiable);  // true ✅
console.log(user instanceof Timestamped);   // true ✅
console.log(user instanceof User);          // true ✅
```

## API Reference

### Core Functions

#### `mix(...mixins)`

Creates a new class that composes all provided mixins.

```typescript
class Dragon extends mix(Flyer, FireBreather, Reptile) {
  name = "Smaug";
}
```

> **Note:** `mix()` uses a heuristic to treat the last class as a base class only when it has constructor parameters. For explicit base class handling, use `mixWithBase()`.

#### `mixWithBase(Base, ...mixins)`

Creates a new class that explicitly extends `Base` and applies all provided mixins.

```typescript
class Admin extends mixWithBase(User, Permissions, AuditLog) {
  // User is the base class, Permissions and AuditLog are mixins
}
```

## Base Class Handling

### `mix()` implicit base-class heuristic

`mix()` treats the **last** class as a base class **only if it has constructor parameters** (i.e. `Ctor.length > 0`).

If the heuristic triggers and you passed multiple classes, polymix logs a warning:

```text
[polymix] Warning: The last class provided to mix() (Base) has constructor parameters and is being treated as a base class. If this is intended to be a mixin, please ensure it has a zero-argument constructor.
```

Examples:

```typescript
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

```typescript
class Example extends mixWithBase(Base, MixinA, MixinB) {}
```

#### `hasMixin(instance, Mixin)`

Type guard to check if an instance has a specific mixin.

```typescript
if (hasMixin(entity, Timestamped)) {
  entity.touch(); // TypeScript knows this method exists
}
```

#### `from(instance, Mixin)`

Disambiguates method calls when multiple mixins have methods with the same name.

```typescript
class FlyingFish extends mix(Fish, Bird) {
  move() {
    if (this.isInWater) {
      return from(this, Fish).move();  // Call Fish's move
    }
    return from(this, Bird).move();    // Call Bird's move
  }
}
```

#### `when(condition, Mixin)`

Conditionally includes a mixin. When `condition` is false, an empty placeholder mixin is used.

```typescript
class SmartDevice extends mix(
  PowerManagement,
  when(process.env.NODE_ENV === 'development', Debuggable),
  when(config.features.logging, Loggable),
) {}
```

### Decorators

#### `@mixin(...mixins)` / `@Use(...mixins)`

Applies mixins to an existing class using decorator syntax.

```typescript
@mixin(Serializable, Observable)
class User extends BaseEntity {
  name: string;
  email: string;
}
```

#### `@abstract`

Marks a mixin class as abstract. Its prototype methods are composed, but it is not instantiated during `new Mixed()`.

```typescript
@abstract
class Identifiable {
  abstract getId(): string;
  
  toString() {
    return `Entity(${this.getId()})`;
  }
}
```

#### `@delegate(Delegate)`

Delegates methods from a property to a helper class instance.

```typescript
class AudioPlayer {
  @delegate(MediaControls)
  private controls = new MediaControls();
  
  // Automatically exposes: play(), pause(), stop(), seek()
}
```

### Composition Strategies

When multiple mixins define the same method, strategies control how they combine:

| Strategy   | Behavior                             | Return Type        |
| ---------- | ------------------------------------ | ------------------ |
| `override` | Last mixin wins (default)            | Single value       |
| `pipe`     | Output of each becomes input of next | Final output       |
| `compose`  | Like pipe, but reverse order         | Final output       |
| `parallel` | Run all concurrently                 | `Promise<T[]>`     |
| `race`     | First to resolve wins                | `Promise<T>`       |
| `merge`    | Deep merge objects/concat arrays     | Merged result      |
| `first`    | First defined (non-undefined) result | Single value       |
| `all`      | All must return truthy               | `Promise<boolean>` |
| `any`      | At least one truthy                  | `Promise<boolean>` |

#### Using Strategy Decorators

```typescript
import { mix, pipe, parallel, merge } from 'polymix';

class DataPipeline extends mix(Validator, Transformer, Sanitizer) {
  @pipe process(data: unknown) { /* auto-chained */ }
  @parallel validate(data: unknown) { /* runs all concurrently */ }
  @merge getErrors() { /* arrays/objects merged */ }
}
```

#### Using Symbol Keys

```typescript
import { mix, strategies } from 'polymix';

class StepA {
  static get [strategies.for('process')]() {
    return strategies.pipe;
  }
  process(x: number) {
    return x + 1;
  }
}

class StepB {
  process(x: number) {
    return x * 2;
  }
}

class Pipeline extends mix(StepA, StepB) {}
new Pipeline().process(10); // 22 → (10+1)*2
```

## TypeScript Support

All types are automatically inferred:

```typescript
import { mix, MixedClass, MixedInstance } from 'polymix';

// Get the mixed class type
type UserClass = MixedClass<[Identifiable, Timestamped]>;

// Get the instance type
type UserInstance = MixedInstance<[Identifiable, Timestamped]>;
```

## Comparison with Other Libraries

| Feature                | polymix          | ts-mixer              | typescript-mix |
| ---------------------- | ---------------- | --------------------- | -------------- |
| `instanceof` support   | ✅                | ❌                     | ❌              |
| Unlimited mixins       | ✅                | ❌ (10 max)            | ✅              |
| Composition strategies | ✅ (9 strategies) | ❌                     | ❌              |
| Decorator inheritance  | ✅                | ⚠️ (requires wrapping) | ❌              |
| TypeScript 5.x         | ✅                | ✅                     | ❌ (abandoned)  |
| Zero dependencies      | ✅                | ✅                     | ✅              |

## Compatibility

polymix is designed to be ts-mixer-friendly, but it is not a 100% drop-in replacement.

### Works well

- `mix(A, B, C)` for composing mixins
- `mixWithBase(Base, A, B)` for explicit base classes
- `instanceof` checks via `Symbol.hasInstance`
- `init(...args)` lifecycle support

### Differences

- polymix has no `settings` object
- `mix()` has an implicit base-class heuristic (see "Base Class Handling")
- `init()` is called per-mixin; there is no shared `super.init()` chain

## License

MIT
