# TypeScript mixin libraries: a definitive comparison

**ts-mixer dominates the TypeScript mixin landscape** with over **1 million weekly downloads**—more than 1,000× the adoption of its nearest decorator-based competitor. For most use cases requiring decorator-augmented class composition, ts-mixer is the clear choice due to its zero dependencies, active maintenance through 2024, and comprehensive feature set. However, developers must understand its limitations around `instanceof` checks and constructor binding before adoption.

The mixin/decorator ecosystem shows a stark divide: a few well-maintained libraries serve the majority of use cases, while dozens of abandoned projects litter npm. This analysis examines the viable options for production TypeScript projects.

---

## ts-mixer leads with comprehensive features and massive adoption

**ts-mixer** provides "tolerable mixin functionality" for TypeScript by automatically inferring types from `Mixin(A, B)` calls—eliminating the manual `Mixin<A & B>(A, B)` annotations other approaches require. Created in 2018 and actively maintained through February 2024, it has become the de facto standard.

| Metric              | Value                  |
| ------------------- | ---------------------- |
| Weekly downloads    | **~1,000,000**         |
| GitHub stars        | 403                    |
| Dependencies        | **0**                  |
| Bundle size         | 72KB unpacked          |
| Last release        | February 2024 (v6.0.4) |
| TypeScript versions | 4.2, 4.6, 5.0, 5.2+    |

**Feature completeness is exceptional.** ts-mixer handles multiple inheritance, static property merging, protected/private visibility, abstract classes (with caveats), generic class mixing via `@mix` decorator, and constructor parameter forwarding through configurable `initFunction`. The library supports two prototype strategies: `'copy'` (ES5 compatible, better performance) and `'proxy'` (ES6, reflects base class changes dynamically).

The API design emphasizes simplicity:

```typescript
import { Mixin } from 'ts-mixer';

class Foo {
    protected makeFoo() { return 'foo'; }
}

class Bar {
    protected makeBar() { return 'bar'; }
}

class FooBar extends Mixin(Foo, Bar) {
    public makeFooBar() {
        return this.makeFoo() + this.makeBar();
    }
}
```

**Decorator inheritance** for libraries like class-validator, TypeORM, and NestJS requires wrapping decorators with the `decorate()` function—a minor friction point but well-documented. The `hasMixin()` function provides type-guarded instance checking since JavaScript's native `instanceof` operator fails with mixed classes.

**Known limitations** include an arbitrary 10-mixin limit (workaround: nest `Mixin()` calls), ES6 constructor `this` binding issues requiring `initFunction` configuration, and documented Angular compatibility problems with proxy mode.

---

## typescript-mix offers elegant syntax but lacks maintenance

**typescript-mix** introduced a cleaner decorator syntax with `@use(Buyer, Transportable)` applied to `this`, creating readable mixin declarations. The library also provides a unique `@delegate` decorator for delegating specific methods to external implementations.

| Metric           | Value                 |
| ---------------- | --------------------- |
| Weekly downloads | ~829                  |
| GitHub stars     | 87                    |
| Dependencies     | 0                     |
| Bundle size      | **10.7KB** (smallest) |
| Last commit      | **8 years ago**       |

The API prioritizes interface-driven design:

```typescript
interface Shopperholic extends Buyer, Transportable {}

class Shopperholic {
    @use(Buyer, Transportable) this
    price = 2000;
    distance = 140;
}
```

**Critical concern: the project is abandoned.** Six open issues remain unaddressed, two pull requests sit unmerged, and no commits have occurred since 2018. The library intentionally ignores properties in mixins (only methods are mixed), which may surprise developers expecting full property inheritance.

**Only consider typescript-mix** for legacy projects already using it or extremely simple use cases where the inactive maintenance isn't problematic.

---

## mixinable takes a unique strategy-based approach

**mixinable** from the untool team differs fundamentally from other libraries by defining *how* methods combine rather than simply copying them. Developers specify strategies like `override`, `parallel`, `pipe`, or `compose` for each method:

```javascript
import define, { pipe } from 'mixinable';

const create = define({
    transform: pipe,  // Chain outputs as inputs
}, [
    class { transform(val) { return val + 1; } },
    class { transform(val) { return val * 2; } },
]);

create().transform(5);  // Returns 12: (5+1)*2
```

| Metric             | Value            |
| ------------------ | ---------------- |
| Weekly downloads   | ~63-207          |
| GitHub stars       | 6                |
| Dependencies       | 0                |
| Last commit        | **5+ years ago** |
| TypeScript support | **None**         |

The strategy pattern is genuinely innovative—methods automatically become async-aware, and custom strategies enable arbitrary composition logic. However, **mixinable lacks TypeScript type definitions entirely**, is effectively abandoned (15 stale PRs), and has minimal adoption.

**Only consider mixinable** if you need its specific strategy-based composition pattern and don't require TypeScript.

---

## Alternative libraries worth evaluating

### Polytype: true multiple inheritance without decorators

**Polytype** (~9,141 weekly downloads) provides dynamic multiple inheritance through a `classes()` function rather than decorators. It offers excellent TypeScript support with proper type inference and handles static methods, prototype chains, and disambiguating inherited members via `super.class(DirectBaseClass)`.

```typescript
import { classes } from "polytype";
class ColoredCircle extends classes(Circle, ColoredObject) { }
```

Last updated 2 years ago, it's a solid choice for projects preferring function-based composition over decorators.

### Stampit: functional composition for non-class patterns

**Stampit** (~123,000 weekly downloads, 3,025 GitHub stars) represents the most mature composition library but uses factory functions ("stamps") rather than classes. It implements three types of prototypal inheritance: delegation, concatenation, and closure-based. While it has TypeScript declarations, the functional paradigm may not fit teams committed to class-based architecture.

### core-decorators: @mixin included in broader decorator library

**core-decorators** (~60,000 weekly downloads) provides a `@mixin` decorator alongside `@autobind`, `@override`, `@deprecate`, and others. It uses the legacy stage-0 decorator specification and hasn't been updated in 8 years, but remains stable for existing projects.

### mixin-decorators: TypeScript 5 native decorator support

For projects targeting TypeScript 5's native (non-experimental) decorators, **mixin-decorators** provides `SubclassDecorator` and `MultiMixinBuilder` patterns. Low adoption but represents the future-facing approach as TypeScript decorators stabilize.

---

## Performance and compilation considerations

**Runtime performance** varies by strategy. ts-mixer's default `'copy'` mode offers better performance than `'proxy'` mode, which incurs ES6 Proxy overhead on every method access. For most applications, this difference is negligible.

**Compilation time presents a more significant concern.** Bryntum's production experience documents that TypeScript's type inference with mixins exhibits **quadratic behavior**—each additional mixin compounds compilation slowdown. In mid-size projects, this can become noticeable. Specifying return types manually on mixin class builders mitigates the issue.

**Bundle sizes** for all viable libraries are reasonable: ts-mixer at 72KB unpacked, typescript-mix at 10.7KB, and most alternatives under 100KB. All have zero dependencies, avoiding transitive dependency risks.

---

## Real-world gotchas developers encounter

Several patterns cause consistent problems across mixin implementations:

**The `instanceof` operator fails.** Mixed class instances don't satisfy `instanceof` checks against their constituent classes. ts-mixer's `hasMixin()` function provides a workaround with TypeScript type narrowing, but this requires changing code patterns.

**Constructor side effects break ts-mixer.** Constructors must be "mostly pure"—no side effects involving `this` beyond property assignment. This conflicts with patterns common in Angular and some NestJS configurations.

**Abstract classes fundamentally conflict with mixins.** The "can't instantiate" semantics of abstract classes clash with the "must instantiate to extend" mechanics of mixin patterns. ts-mixer provides a `@ts-ignore` workaround for TypeScript 4.2+.

**Decorator library integration requires wrapping.** NestJS, TypeORM, class-validator decorators must be wrapped with ts-mixer's `decorate()` function. Forgetting this produces silent failures where decorators simply don't apply.

---

## Comparison table

| Library         | Downloads/week | Stars  | Last Update | Decorators | TS Support | Dependencies |
| --------------- | -------------- | ------ | ----------- | ---------- | ---------- | ------------ |
| **ts-mixer**    | 1,000,000+     | 403    | Feb 2024    | Yes        | Excellent  | 0            |
| polytype        | 9,141          | ~20    | 2022        | No         | Excellent  | 0            |
| stampit         | 123,000+       | 3,025  | 2024        | No         | Good       | 0            |
| core-decorators | 60,000+        | ~3,000 | 2016        | Yes        | Good       | 0            |
| typescript-mix  | 829            | 87     | 2018        | Yes        | Good       | 0            |
| class-mixins    | Low            | ~10    | 2022        | Optional   | Good       | 0            |
| mixinable       | 63-207         | 6      | 2020        | No         | **None**   | 0            |

---

## Ranked recommendations

**#1 ts-mixer** — The clear winner for decorator-based mixin needs. Massive adoption validates production readiness, zero dependencies minimize risk, and the feature set covers nearly all requirements. Accept its `instanceof` limitation and constructor constraints.

**#2 Polytype** — Best alternative if you prefer function-based composition over decorators. Excellent TypeScript support, active enough maintenance, and clean API. Choose this when decorator syntax isn't required.

**#3 Stampit** — Superior for teams embracing functional composition over class inheritance. Most mature codebase, excellent documentation, but paradigm shift required from class-based thinking.

**#4 class-mixins** — Reasonable choice for simple needs with flexibility between decorator and function APIs. Lower adoption means less community support.

**#5 typescript-mix** — Only for legacy compatibility. The abandoned state disqualifies it for new projects despite elegant syntax.

**#6 mixinable** — Niche use case only. The strategy pattern is innovative but lack of TypeScript support and abandonment make it impractical for modern TypeScript projects.

---

## Conclusion

The TypeScript mixin ecosystem has consolidated around **ts-mixer** as the dominant solution, with **Polytype** serving as a strong non-decorator alternative. Most other libraries are either abandoned, lack TypeScript support, or have minimal adoption that creates long-term maintenance risk.

For new projects requiring decorator-based class composition, ts-mixer delivers the best combination of features, type safety, and community validation. Its limitations—particularly around `instanceof` and constructor binding—are well-documented with established workarounds. Teams should evaluate whether the mixin pattern itself suits their architecture before committing, as some developers advocate for explicit composition via dependency injection as a cleaner alternative for shared behavior.