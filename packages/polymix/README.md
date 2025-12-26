# @lellimecnar/polymix

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
pnpm add @lellimecnar/polymix
# or
npm install @lellimecnar/polymix
```

For decorator metadata support (optional):
```bash
pnpm add reflect-metadata
```

## Quick Start

```typescript
import { mix } from '@lellimecnar/polymix';

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
import { mix, pipe, parallel, merge } from '@lellimecnar/polymix';

class DataPipeline extends mix(Validator, Transformer, Sanitizer) {
  @pipe process(data: unknown) { /* auto-chained */ }
  @parallel validate(data: unknown) { /* runs all concurrently */ }
  @merge getErrors() { /* arrays/objects merged */ }
}
```

#### Using Symbol Keys

```typescript
import { mix, strategies } from '@lellimecnar/polymix';

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
import { mix, MixedClass, MixedInstance } from '@lellimecnar/polymix';

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

## License

MIT
