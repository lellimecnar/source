# polymix: Next-Generation TypeScript Mixins

A hypothetical library combining the best of ts-mixer, typescript-mix, mixinable, and Polytype—while eliminating their fundamental limitations using modern TypeScript 5.x and ES2024+ features.

---

## Design Philosophy

1. **Zero compromise on `instanceof`** — Mixed classes work with native `instanceof`
2. **Constructor freedom** — No restrictions on constructor side effects
3. **Automatic decorator inheritance** — NestJS, TypeORM, class-validator work without wrapping
4. **Abstract classes** — Mixin classes can be abstract
5. **Strategy-based composition** — Control *how* methods merge, not just *that* they merge
6. **Compile-time safety** — Catch conflicts and ambiguities before runtime
7. **No arbitrary limits** — Mix as many classes as needed

---

## Core API Design

### 1. The `mix()` Function — Primary Composition

```typescript
import { mix } from 'polymix';

// Simple case: automatic type inference
class Dragon extends mix(Flyer, FireBreather, Reptile) {
  name = "Smaug";
}

const dragon = new Dragon();
dragon.fly();           // From Flyer
dragon.breatheFire();   // From FireBreather
dragon.shedSkin();      // From Reptile

// Native instanceof works!
dragon instanceof Flyer;        // true ✓
dragon instanceof FireBreather; // true ✓
dragon instanceof Dragon;       // true ✓
```

### 2. The `@mixin` Decorator — For Existing Classes

```typescript
import { mixin } from 'polymix';

// Decorator syntax for adding mixins to existing class hierarchies
@mixin(Serializable, Observable)
class User extends BaseEntity {
  name: string;
  email: string;
}

// Equivalent to: class User extends mix(BaseEntity, Serializable, Observable)
```

### 3. The `@delegate` Decorator — Explicit Delegation

```typescript
import { delegate } from 'polymix';

class AudioPlayer {
  @delegate(MediaControls)
  private controls = new MediaControls();
  
  // Automatically exposes: play(), pause(), stop(), seek()
  // But keeps MediaControls as composition, not inheritance
}
```

### 4. Strategy-Based Method Composition

When multiple mixins define the same method, control how they combine:

```typescript
import { mix, strategies } from 'polymix';

class DataPipeline extends mix(Validator, Transformer, Sanitizer) {
  // Define how conflicting methods resolve
  static [strategies.for('process')] = strategies.pipe;
  // Input flows: Validator.process → Transformer.process → Sanitizer.process
  
  static [strategies.for('validate')] = strategies.parallel;
  // All validate() methods run concurrently, returns Promise<boolean[]>
  
  static [strategies.for('getErrors')] = strategies.merge;
  // Arrays/objects from all mixins are merged
  
  static [strategies.for('getName')] = strategies.override;
  // Last mixin wins (default behavior)
}

// Or inline with decorators:
class DataPipeline extends mix(Validator, Transformer, Sanitizer) {
  @pipe process(data: unknown) { /* auto-chained */ }
  @parallel validate(data: unknown) { /* runs all concurrently */ }
  @first canHandle(data: unknown) { /* first truthy result wins */ }
}
```

**Built-in Strategies:**

| Strategy   | Behavior                             | Return Type    |
| ---------- | ------------------------------------ | -------------- |
| `override` | Last mixin wins (default)            | Single value   |
| `pipe`     | Output of each becomes input of next | Final output   |
| `compose`  | Like pipe, but reverse order         | Final output   |
| `parallel` | Run all concurrently                 | `Promise<T[]>` |
| `race`     | First to resolve wins                | `Promise<T>`   |
| `merge`    | Deep merge objects/concat arrays     | Merged result  |
| `first`    | First truthy result                  | Single value   |
| `all`      | All must return truthy               | `boolean`      |
| `any`      | At least one truthy                  | `boolean`      |

### 5. Disambiguation with `from()`

When you need to call a specific mixin's implementation:

```typescript
import { mix, from } from 'polymix';

class FlyingFish extends mix(Fish, Bird) {
  move() {
    if (this.isInWater) {
      return from(this, Fish).move();  // Call Fish's move
    }
    return from(this, Bird).move();    // Call Bird's move
  }
  
  // Or use the shorthand property:
  moveInWater() {
    return this[Fish].move();  // Symbol-based access
  }
}
```

### 6. Abstract Mixin Support

```typescript
import { mix, abstract } from 'polymix';

// Mark a mixin as abstract — won't be instantiated during mixing
@abstract
class Identifiable {
  abstract getId(): string;
  
  toString() {
    return `Entity(${this.getId()})`;
  }
}

// Concrete class must implement abstract methods
class User extends mix(Identifiable, Timestamped) {
  getId() { return this.email; }  // Required implementation
}
```

### 7. Conditional Mixins

```typescript
import { mix, when } from 'polymix';

class SmartDevice extends mix(
  PowerManagement,
  when(process.env.NODE_ENV === 'development', Debuggable),
  when(config.features.logging, Loggable),
) {
  // Debuggable and Loggable only mixed in when conditions are true
  // Types are properly narrowed based on conditions
}
```

### 8. Generic Mixins with Constraints

```typescript
import { mix, Mixin } from 'polymix';

// Define a generic mixin factory
const Comparable = <T>() => class {
  compareTo(other: T): number {
    // Implementation
  }
};

// Or with the Mixin helper type
type Repository<T> = Mixin<{
  findById(id: string): Promise<T>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<boolean>;
}>;

class UserRepository extends mix(
  BaseRepository,
  Comparable<User>(),
  Cacheable<User>({ ttl: 3600 }),
) {
  // Full type inference for User-specific methods
}
```

---

## Advanced Features

### Automatic Decorator Inheritance

No more wrapping decorators — metadata is preserved automatically:

```typescript
import { Entity, Column } from 'typeorm';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { mix } from 'polymix';

class EmailFields {
  @Column()
  @IsEmail()
  email: string;
}

class TimestampFields {
  @Column()
  createdAt: Date;
  
  @Column()
  updatedAt: Date;
}

@Entity()
class User extends mix(EmailFields, TimestampFields) {
  @Column()
  @IsNotEmpty()
  name: string;
}

// All decorators from mixins are automatically inherited!
// TypeORM sees all @Column decorators
// class-validator sees @IsEmail and @IsNotEmpty
```

### Lifecycle Hooks

```typescript
import { mix, onMix, onConstruct } from 'polymix';

class Loggable {
  @onMix  // Called when this mixin is applied to a class
  static onMixed(targetClass: Function) {
    console.log(`Loggable mixed into ${targetClass.name}`);
  }
  
  @onConstruct  // Called during instance construction
  private initLogging() {
    this.logger = new Logger(this.constructor.name);
  }
}
```

### Conflict Detection at Compile Time

```typescript
import { mix } from 'polymix';

class A {
  value: string = 'a';
  process(): string { return 'A'; }
}

class B {
  value: number = 42;  // Different type!
  process(): number { return 42; }  // Different return type!
}

// TypeScript error at compile time:
class Broken extends mix(A, B) {}
//                  ^^^^^^^^
// Error: Property 'value' has conflicting types in mixins A and B
//        A.value: string, B.value: number
//        Use @resolve('value') to specify resolution strategy

// Resolution:
class Fixed extends mix(A, B) {
  @resolve('value', from => from(A))  // Use A's value
  declare value: string;
  
  @resolve('process', strategies.pipe)  // Chain them
  declare process: () => number;  // A.process() piped to B.process()
}
```

---

## Implementation Architecture

### How `instanceof` Actually Works

The magic uses `Symbol.hasInstance`:

```typescript
// Internal implementation sketch
function mix<T extends Constructor[]>(...mixins: T): MixedClass<T> {
  // Create the mixed class
  class Mixed {
    constructor(...args: any[]) {
      // Initialize all mixin instances
      for (const Mixin of mixins) {
        const instance = Reflect.construct(Mixin, args, Mixed);
        Object.assign(this, instance);
      }
    }
    
    // Custom instanceof behavior
    static [Symbol.hasInstance](instance: any): boolean {
      // Check if instance has all properties/methods of this mixin
      return mixins.every(Mixin => 
        instance instanceof Mixin || hasMixinSignature(instance, Mixin)
      );
    }
  }
  
  // Copy prototype chain properly
  const prototypeChain = mixins.map(m => m.prototype);
  Mixed.prototype = createMultiPrototype(prototypeChain);
  
  // Each original mixin class also gets Symbol.hasInstance
  for (const Mixin of mixins) {
    if (!Object.hasOwn(Mixin, Symbol.hasInstance)) {
      Object.defineProperty(Mixin, Symbol.hasInstance, {
        value: (instance: any) => {
          return getMixinRegistry(instance)?.has(Mixin) ?? false;
        }
      });
    }
  }
  
  return Mixed as MixedClass<T>;
}
```

### How Constructor Freedom Works

Using deferred initialization and proxy-based `this`:

```typescript
// Mixin with complex constructor side effects
class DatabaseConnection {
  private connection: Connection;
  
  constructor(config: DbConfig) {
    // This WOULD break ts-mixer, but works in polymix
    this.connection = new Connection(config);
    this.connection.on('error', this.handleError.bind(this));
    globalRegistry.register(this);  // Side effect involving `this`
  }
}

// Internal: polymix uses construction proxies
function createMixedInstance(MixedClass, args) {
  // 1. Create shell instance without running constructors
  const instance = Object.create(MixedClass.prototype);
  
  // 2. Create proxy that buffers operations during construction
  const constructionProxy = new Proxy(instance, {
    get(target, prop) {
      // Allow property access, queue side effects
      return Reflect.get(target, prop);
    },
    set(target, prop, value) {
      // Capture property assignments
      return Reflect.set(target, prop, value);
    }
  });
  
  // 3. Run each mixin constructor with proxy as `this`
  for (const Mixin of getMixins(MixedClass)) {
    Mixin.prototype.constructor.call(constructionProxy, ...args);
  }
  
  // 4. Finalize instance
  return instance;
}
```

### How Decorator Inheritance Works

Using TypeScript 5's decorator metadata:

```typescript
// TypeScript 5.2+ decorator metadata API
function mix(...mixins) {
  return function(target) {
    // Collect all decorator metadata from mixins
    for (const Mixin of mixins) {
      const metadata = Mixin[Symbol.metadata];
      if (metadata) {
        // Merge class decorators
        mergeMetadata(target, metadata);
        
        // Merge property/method decorators
        for (const key of Object.keys(Mixin.prototype)) {
          const propMetadata = metadata[key];
          if (propMetadata) {
            applyPropertyMetadata(target.prototype, key, propMetadata);
          }
        }
      }
    }
  };
}

// Works with reflect-metadata for legacy support
import 'reflect-metadata';

function mix(...mixins) {
  // ... also copies Reflect.getMetadata for each decorator key
  for (const Mixin of mixins) {
    const metadataKeys = Reflect.getMetadataKeys(Mixin);
    for (const key of metadataKeys) {
      const value = Reflect.getMetadata(key, Mixin);
      Reflect.defineMetadata(key, value, target);
    }
  }
}
```

---

## Type System Implementation

### Core Types

```typescript
// Extract constructor parameters union from all mixins
type MixinParams<T extends Constructor[]> = 
  T extends [infer First extends Constructor, ...infer Rest extends Constructor[]]
    ? ConstructorParameters<First> | MixinParams<Rest>
    : never;

// Merge instance types from all mixins
type MixedInstance<T extends Constructor[]> = 
  T extends [infer First extends Constructor, ...infer Rest extends Constructor[]]
    ? InstanceType<First> & MixedInstance<Rest>
    : {};

// Merge static types from all mixins
type MixedStatic<T extends Constructor[]> = 
  T extends [infer First extends Constructor, ...infer Rest extends Constructor[]]
    ? First & MixedStatic<Rest>
    : {};

// The mixed class type
type MixedClass<T extends Constructor[]> = 
  MixedStatic<T> & {
    new (...args: MixinParams<T>): MixedInstance<T>;
  };

// Detect conflicts at type level
type DetectConflicts<T extends Constructor[]> = {
  [K in keyof MixedInstance<T>]: 
    ConflictingDefinitions<T, K> extends never 
      ? MixedInstance<T>[K]
      : `Conflict: Property '${K}' has incompatible types in mixins`;
};
```

### Variadic Generics (No 10-Mixin Limit)

TypeScript 4.0+ variadic tuple types enable unlimited mixins:

```typescript
// Works with any number of mixins
function mix<T extends Constructor[]>(...mixins: [...T]): MixedClass<T>;

// Usage with 15 mixins — no problem!
class MegaClass extends mix(
  A, B, C, D, E, F, G, H, I, J, K, L, M, N, O
) {}
```

---

## Performance Optimizations

### Lazy Prototype Resolution

```typescript
// Don't copy all methods upfront — resolve on first access
const lazyPrototype = new Proxy({}, {
  get(target, prop, receiver) {
    // Check cache first
    if (prop in target) return target[prop];
    
    // Find which mixin provides this method
    for (const Mixin of mixins) {
      if (prop in Mixin.prototype) {
        const method = Mixin.prototype[prop];
        // Cache for future access
        target[prop] = method;
        return method;
      }
    }
    return undefined;
  }
});
```

### Compilation Performance

Use explicit type annotations in generated code to avoid quadratic inference:

```typescript
// Instead of letting TS infer everything (slow):
const Mixed = mix(A, B, C, D, E);

// Library internally generates explicit types (fast):
const Mixed: MixedClass<[typeof A, typeof B, typeof C, typeof D, typeof E]> 
  = mix(A, B, C, D, E);
```

### WeakMap-Based Instance Registry

For `hasMixin` checks without memory leaks:

```typescript
const mixinRegistry = new WeakMap<object, Set<Constructor>>();

function registerMixins(instance: object, mixins: Constructor[]) {
  mixinRegistry.set(instance, new Set(mixins));
}

function hasMixin<T extends Constructor>(
  instance: unknown, 
  mixin: T
): instance is InstanceType<T> {
  if (!instance || typeof instance !== 'object') return false;
  return mixinRegistry.get(instance)?.has(mixin) ?? false;
}
```

---

## Comparison with Existing Libraries

| Feature                 | ts-mixer | typescript-mix | mixinable | Polytype | **polymix**   |
| ----------------------- | -------- | -------------- | --------- | -------- | ------------- |
| Native `instanceof`     | ❌        | ❌              | ❌         | ❌        | ✅             |
| Constructor freedom     | ❌        | ✅              | ✅         | ✅        | ✅             |
| Decorator inheritance   | Manual   | ❌              | N/A       | ❌        | **Automatic** |
| Strategy composition    | ❌        | ❌              | ✅         | ❌        | ✅             |
| Unlimited mixins        | ❌ (10)   | ✅              | ✅         | ✅        | ✅             |
| Compile-time conflicts  | ❌        | ❌              | N/A       | Partial  | ✅             |
| Disambiguation          | ❌        | ❌              | ❌         | ✅        | ✅             |
| Abstract mixins         | Hacky    | ❌              | ❌         | ❌        | ✅             |
| Conditional mixins      | ❌        | ❌              | ❌         | ❌        | ✅             |
| TypeScript 5 decorators | ❌        | ❌              | ❌         | ❌        | ✅             |
| Zero dependencies       | ✅        | ✅              | ✅         | ✅        | ✅             |

---

## Full Example: Real-World Usage

```typescript
import { 
  mix, mixin, delegate, abstract,
  strategies, from, when,
  onConstruct, resolve
} from 'polymix';

// ============================================
// Define reusable mixins
// ============================================

@abstract
class Identifiable {
  abstract getId(): string;
  
  equals(other: Identifiable): boolean {
    return this.getId() === other.getId();
  }
}

class Timestamped {
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
  
  touch() {
    this.updatedAt = new Date();
  }
}

class Serializable {
  toJSON(): object {
    return { ...this };
  }
  
  static fromJSON<T>(this: new (...args: any[]) => T, json: object): T {
    return Object.assign(new this(), json);
  }
}

class Observable<T = unknown> {
  #listeners = new Map<string, Set<(data: T) => void>>();
  
  on(event: string, handler: (data: T) => void) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event)!.add(handler);
  }
  
  emit(event: string, data: T) {
    this.#listeners.get(event)?.forEach(fn => fn(data));
  }
}

class Validatable {
  #errors: string[] = [];
  
  abstract validate(): boolean;
  
  get errors() { return [...this.#errors]; }
  
  addError(msg: string) { this.#errors.push(msg); }
  clearErrors() { this.#errors = []; }
}

// ============================================
// Compose into a domain entity
// ============================================

@Entity()  // TypeORM decorator — automatically inherited!
class User extends mix(
  Identifiable,
  Timestamped,
  Serializable,
  Observable<UserEvent>,
  Validatable,
  when(config.features.softDelete, SoftDeletable),
) {
  @PrimaryColumn()
  email: string;
  
  @Column()
  name: string;
  
  @Column({ select: false })
  passwordHash: string;
  
  constructor(email: string, name: string) {
    super();  // Initializes all mixins
    this.email = email;
    this.name = name;
  }
  
  // Implement abstract from Identifiable
  getId(): string {
    return this.email;
  }
  
  // Implement abstract from Validatable
  validate(): boolean {
    this.clearErrors();
    if (!this.email.includes('@')) {
      this.addError('Invalid email format');
    }
    if (this.name.length < 2) {
      this.addError('Name too short');
    }
    return this.errors.length === 0;
  }
  
  // Override with strategy for methods that exist in multiple mixins
  @pipe
  async save(): Promise<void> {
    // Chains: Validatable.preSave → Timestamped.touch → DB save
    this.touch();
    await db.save(this);
    this.emit('saved', { user: this });
  }
}

// ============================================
// Usage
// ============================================

const user = new User('alice@example.com', 'Alice');

// All mixin methods available with full type safety
user.touch();                          // From Timestamped
user.on('saved', console.log);         // From Observable
console.log(user.toJSON());            // From Serializable
console.log(user.equals(otherUser));   // From Identifiable
console.log(user.validate());          // From Validatable

// instanceof works natively!
console.log(user instanceof User);         // true
console.log(user instanceof Timestamped);  // true
console.log(user instanceof Observable);   // true
console.log(user instanceof Identifiable); // true

// Disambiguation when needed
class AdminUser extends mix(User, AdminCapabilities) {
  override validate(): boolean {
    // Call specific parent's validate
    const userValid = from(this, User).validate();
    const adminValid = from(this, AdminCapabilities).validate();
    return userValid && adminValid;
  }
}

// Serialization round-trip with static methods
const json = user.toJSON();
const restored = User.fromJSON(json);  // Static methods inherited too!
```

---

## Conclusion

**polymix** represents what a modern mixin library could achieve by:

1. **Embracing `Symbol.hasInstance`** for native `instanceof` support
2. **Using construction proxies** for constructor freedom
3. **Leveraging TypeScript 5 decorator metadata** for automatic inheritance
4. **Borrowing mixinable's strategies** for controlled method composition
5. **Adopting Polytype's disambiguation** via `from()` helper
6. **Utilizing variadic tuple types** for unlimited mixin support
7. **Implementing compile-time conflict detection** through advanced type inference

The result is a library that eliminates the sharp edges of existing solutions while maintaining the simplicity that made ts-mixer successful.