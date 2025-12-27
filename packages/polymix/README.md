## polymix

Next-generation TypeScript mixins: true `instanceof`, unlimited mixins, and predictable conflict resolution.

### Why

- Mixed instances pass `instanceof` checks for every mixin (via `Symbol.hasInstance` + an internal registry)
- Unlimited mixins (variadic generics)
- Conflict resolution via built-in composition strategies
- Optional decorator helpers (legacy TS decorators) and metadata copying (`Symbol.metadata` / `reflect-metadata`)
- Zero required runtime dependencies

> [!NOTE]
> This package lives in a monorepo. The published package name is `polymix`.

### Install

```bash
pnpm add polymix
# or
npm install polymix
```

Optional (only if you rely on decorator metadata at runtime):

```bash
pnpm add reflect-metadata
```

### Quick start

```ts
import { mix } from 'polymix';

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

user.id; // '123'
user.createdAt; // Date

user instanceof Identifiable; // true
user instanceof Timestamped; // true
user instanceof User; // true
```

> [!TIP]
> If you need a base class with constructor parameters, prefer `mixWithBase()` to avoid the implicit base-class heuristic used by `mix()`.

### Core API

#### `mix(...classes)`

Composes all provided classes.

`mix()` has an implicit base-class heuristic: if the last class has constructor parameters (i.e. `Ctor.length > 0`), it is treated as the base class; otherwise all classes are treated as mixins.

> [!WARNING]
> If that heuristic triggers (constructor params + more than one class), `polymix` logs a warning because it may be ambiguous.

```ts
import { mix } from 'polymix';

class Flyer {
	fly() {}
}

class FireBreather {
	breatheFire() {}
}

class Dragon extends mix(Flyer, FireBreather) {
	name = 'Smaug';
}
```

#### `mixWithBase(Base, ...mixins)`

Explicitly extends `Base` and applies all `mixins`.

```ts
import { mixWithBase } from 'polymix';

class Person {
	constructor(readonly name: string) {}
}

class Timestamped {
	createdAt = new Date();
}

class User extends mixWithBase(Person, Timestamped) {}

const user = new User('Ada');
user instanceof Person; // true
```

#### `hasMixin(instance, Mixin)`

Type guard for `instanceof`.

```ts
import { hasMixin } from 'polymix';

if (hasMixin(user, Timestamped)) {
	user.createdAt;
}
```

#### `from(instance, Mixin)`

Calls a specific mixin’s implementation when names collide.

```ts
import { from, mix } from 'polymix';

class Fish {
	move() {
		return 'swim';
	}
}

class Bird {
	move() {
		return 'fly';
	}
}

class FlyingFish extends mix(Fish, Bird) {
	isInWater = true;

	move() {
		return this.isInWater ? from(this, Fish).move() : from(this, Bird).move();
	}
}
```

#### `when(condition, Mixin)`

Conditionally includes a mixin. When `condition` is false, a placeholder mixin is used.

```ts
import { mix, when } from 'polymix';

class Debuggable {
	debug() {}
}

class Device extends mix(
	when(process.env.NODE_ENV !== 'production', Debuggable),
) {}
```

### Composition strategies

When multiple mixins define the same method name, polymix combines them using a strategy.

| Strategy   | Behavior                                                                  | Return type               |
| ---------- | ------------------------------------------------------------------------- | ------------------------- |
| `override` | Runs all implementations in order; returns the last result (default)      | value                     |
| `pipe`     | Calls each implementation with the previous result as its single argument | value or `Promise<value>` |
| `compose`  | Like `pipe`, but right-to-left                                            | value or `Promise<value>` |
| `parallel` | Runs all implementations concurrently                                     | `Promise<value[]>`        |
| `race`     | Resolves with the first completed implementation                          | `Promise<value>`          |
| `merge`    | Deep merges plain objects; concatenates arrays                            | merged value              |
| `first`    | Returns the first result that is **not** `undefined`                      | value                     |
| `all`      | `true` only if all results are truthy (awaits promises)                   | `Promise<boolean>`        |
| `any`      | `true` if any result is truthy (awaits promises)                          | `Promise<boolean>`        |

> [!NOTE]
> Accessors (getters/setters) are copied directly onto the mixed prototype. If multiple mixins define the same accessor, the last one applied wins.

#### Strategy decorators (legacy TS decorators)

```ts
import { merge, mix, parallel, pipe } from 'polymix';

class Validator {
	validate(_data: unknown) {
		return true;
	}
}

class Transformer {
	process(data: string) {
		return data.trim();
	}
}

class Sanitizer {
	process(data: string) {
		return data.replaceAll(/\s+/g, ' ');
	}
}

class Pipeline extends mix(Validator, Transformer, Sanitizer) {
	@pipe
	process(_data: string) {
		// Signature is only used for typing; implementations come from mixins.
		return '';
	}

	@parallel
	validate(_data: unknown) {
		return false;
	}

	@merge
	getMeta() {
		return {};
	}
}
```

> [!IMPORTANT]
> The strategy/mixin decorators in `polymix` use the legacy TypeScript decorator signature (`experimentalDecorators`). If you’re using the new decorators proposal, prefer symbol strategies (below) or confirm your compiler emits compatible decorator calls.

#### Symbol strategies (no decorators)

```ts
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

new Pipeline().process(10); // 22
```

### Mixins as decorators

#### `@mixin(...mixins)` / `@Use(...mixins)`

Applies mixins to an existing class.

##### `extends mix(...)` vs `@mixin(...)`

Both approaches apply the same mixin machinery (method composition, `instanceof` support, and per-mixin initialization), but they differ in _how_ the final class is produced and how it fits into your type/constructor story.

- `class X extends mix(A, B) {}`: **creates a new class** (a generated base class) that `X` extends.
- `@mixin(A, B) class X {}`: **modifies an existing class** `X` in-place (via a class decorator).

**Choose `extends mix(...)` when:**

- You are defining a _new_ class and want the most explicit, portable form (no decorators required).
- You want to use `mixWithBase(Base, ...mixins)` for an explicit base class (recommended whenever the base has constructor params).
- You want the clearest mental model: “this class extends a mixed base”.

**Choose `@mixin(...)` when:**

- You already have an existing class declaration (or inheritance chain) and want to _add_ mixins without rewriting it into `extends mixWithBase(...)`.
- You need to keep your `extends SomeBase` exactly as-is (e.g. framework base classes) and prefer to layer mixins on top.
- You want to apply the same set of mixins across many classes with minimal syntax.

**Key behavioral differences to be aware of:**

- **Constructor/base-class handling**:
  - With `extends mix(...)`, base selection follows `mix()`’s heuristic, or you can be explicit with `mixWithBase()`.
  - With `@mixin(...)`, your class’s existing `extends` (if any) remains the base; mixins are applied “around” that class.
- **Tooling requirements**:
  - `extends mix(...)` works in plain TypeScript/JavaScript (no decorator support needed).
  - `@mixin(...)` requires TypeScript legacy decorators (`experimentalDecorators`) or a compatible decorator pipeline.
- **Readability/intent**:
  - `extends mix(...)` makes the composition obvious at the inheritance site.
  - `@mixin(...)` keeps the `extends` clause focused on the true base class and moves composition into a decorator.

```ts
import { mixin } from 'polymix';

@mixin(Timestamped, Identifiable)
class Account {
	constructor(readonly email: string) {}
}
```

#### `@abstract`

Marks a mixin as “prototype-only”: its methods are composed, but it is not instantiated during `new Mixed()`.

```ts
import { abstract } from 'polymix';

@abstract
class Identifiable {
	id = 'n/a';
}
```

#### `@delegate(Delegate)`

Delegates methods to a helper instance stored in a property.

```ts
import { delegate } from 'polymix';

class MediaControls {
	play() {}
	pause() {}
}

class AudioPlayer {
	@delegate(MediaControls)
	private controls = new MediaControls();
}

new AudioPlayer().play();
```

### TypeScript types

```ts
import type { MixedClass, MixedInstance } from 'polymix';

type UserClass = MixedClass<[Identifiable, Timestamped]>;
type UserInstance = MixedInstance<[Identifiable, Timestamped]>;
```

### Metadata support

If you use runtime metadata reflection (common with `reflect-metadata`), you usually want to import it once at app startup:

```ts
import 'reflect-metadata';
```

polymix will copy decorator metadata from mixins onto the mixed class where possible.

### Compatibility notes

polymix is designed to be ts-mixer-friendly, but it is not a 100% drop-in replacement.

- Works well: `mix()`, `mixWithBase()`, `instanceof`, and per-mixin `init(...args)` calls
- Differences: no global `settings` object; `mix()` has an implicit base-class heuristic; `init()` runs once per mixin (no shared `super.init()` chain)

> [!NOTE]
> See `MIGRATION.md` for migration notes and incompatibilities.
