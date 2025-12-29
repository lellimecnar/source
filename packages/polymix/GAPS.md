---
post_title: 'polymix gaps for card-stack'
author1: 'GitHub Copilot (GPT-5.2)'
post_slug: 'polymix-gaps-card-stack'
microsoft_alias: 'n/a'
featured_image: ''
categories: []
tags: ['polymix', 'card-stack', 'mixins', 'ts-mixer', 'typescript']
ai_note: 'AI-assisted analysis of existing repo code.'
summary: 'Identifies functionality and compatibility gaps in polymix that would need to be addressed before adopting it in card-stack (currently built around ts-mixer patterns).'
post_date: '2025-12-26'
---

## Scope

This document reviews `packages/polymix` specifically through the lens of adopting it inside `packages/card-stack/*`.

- `polymix` is a mixin composition library with method conflict strategies and `instanceof` support.
- `card-stack` currently uses `ts-mixer` (including `settings`, `Mixin as Mix`, and `@mix(...)`), and relies heavily on an `init(...args)` lifecycle.

## What card-stack expects today

Key observed expectations in `packages/card-stack/core`:

- `ts-mixer` is configured via `settings` in [packages/card-stack/core/src/utils.ts](../../packages/card-stack/core/src/utils.ts).
  - `initFunction: 'init'`
  - `prototypeStrategy: 'copy'`
  - `staticsStrategy: 'copy'`
  - `decoratorInheritance: 'deep'`
- Composition is used in two shapes:
  - `class X extends Mix(A, B, C) { ... }`
  - `@mix(A, B) class X { ... }`
- Lifecycle: `init(...args)` is treated as a first-class constructor-like hook.
  - Domain classes (example: `Card`) define their own `init(...)` that calls `super.init(...)` and then performs class-specific initialization.

## What polymix provides today

Based on `packages/polymix/src/*` and tests:

- Class composition: `mix(...classes)` and `mixWithBase(Base, ...mixins)`.
- Type guards / disambiguation:
  - `hasMixin(instance, Mixin)` (implemented as `instance instanceof Mixin`)
  - `from(instance, Mixin)` (proxy to call a specific implementation)
  - `when(condition, Mixin)`
- `instanceof` support for mixins via `Symbol.hasInstance` + internal registry.
- Method conflict resolution via strategies (default is `override`).
- Optional decorator helpers (`@mixin`, `@Use`, and method strategy decorators).
- Reflect-metadata copying support (best-effort).

## Gaps and risks for card-stack adoption

### 1) `init(...args)` lifecycle is not compatible with card-stack’s current pattern

In `polymix`, construction does this (summarized from `mixWithBase`):

- Calls `registerMixins(this, mixins)`
- For each mixin:
  - Attempts `Reflect.construct(mixin, args)` and `Object.assign(...)` the fields
  - Calls `mixin.prototype.init?.apply(this, args)`

Issues for `card-stack`:

- `polymix` calls `init()` on _each mixin_, but does not automatically invoke the _concrete class’_ `init()`.
  - Example expectation: `Card.init(...args)` should run as part of construction (because card-stack uses `settings.initFunction = 'init'`).
  - Under `polymix`, only mixin `init()` hooks run automatically, not the derived class’ own `init()`.
- `card-stack` relies on `super.init(...)` chaining in its own `init()` methods.
  - `polymix` does not linearize mixins into a prototype chain where `super` naturally walks “next mixin”.
  - Instead, it composes methods onto the final prototype and separately calls mixin `init()` during construction.

Net: adopting `polymix` without changing card-stack would cause class-specific `init()` hooks (and their `super.init` chain) to stop running automatically.

### 2) Default method conflict behavior is “execute all”, not “copy/last wins”

`polymix`’s default `override` strategy executes all implementations in order and returns the last result.

- This is observably different from a pure “copy” model where only the last implementation runs.
- For card-stack, this is highest risk around `init()` and any future overlapping method names:
  - Multiple executions can introduce duplicate side effects (registration, mutation, validation, etc.).

If card-stack ever composes mixins that share method names (even unintentionally), `polymix` will run multiple implementations unless strategy metadata is present.

### 3) Missing ts-mixer API surface (`settings`, naming, decorator)

`card-stack` imports and uses ts-mixer specifics:

- `settings` (mutated at runtime)
- `Mixin as Mix` and `mix` (ts-mixer exports)
- `@mix(...)` decorator (ts-mixer)

`polymix` differences:

- No `settings` API.
- The composition function is named `mix`, but the class decorator is `mixin` / `Use` (not `mix`).
- Decorator behavior is implemented by returning a subclass from `mixWithBase(Target, ...mixins)`.

Net: for card-stack, adoption requires either:

- An adapter layer that re-exports a ts-mixer-compatible API from `polymix`, or
- A migration touching all call sites.

### 4) Base-class semantics differ and may affect `@mix(Base, Mixin)` patterns

`polymix` base-class handling differs from ts-mixer:

- `mix()` uses a heuristic: “last class is base iff it has constructor params”.
- `mixWithBase()` is the explicit path.

Card-stack uses `@mix(CardSet, Indexable)` where `CardSet` does not obviously require ctor params.

- Under polymix, `CardSet` would be treated as a mixin unless `mixWithBase(CardSet, Indexable)` is used.
- If card-stack relies on `CardSet` being the actual base in the prototype chain (for `super` calls and static inheritance), this needs explicit modeling.

### 5) Decorator/metadata inheritance is only best-effort

Card-stack’s spec explicitly mentions `class-validator` and decorators.

`polymix` attempts to copy:

- `Symbol.metadata` (if present)
- `reflect-metadata` keys (class-level and discovered property-level)

Risk areas for card-stack:

- Property discovery for metadata copying is inherently heuristic (it may fail for undecorated/uninitialized fields, private fields, or decorators applied in ways that don’t leave enumerable traces).
- `ts-mixer`’s `decoratorInheritance: 'deep'` suggests more robust inheritance semantics than a shallow “copy what we can find” approach.

## Required capabilities (minimum) for card-stack use

To use `polymix` in `card-stack` without re-architecting core patterns, `polymix` (or a thin compatibility package) likely needs:

- A ts-mixer-compatible surface:
  - `Mix(...)` alias for class extension (or export name parity)
  - `@mix(...)` decorator alias (or an equivalent that matches card-stack expectations)
  - `hasMixin(obj, Mixin)` with the same runtime semantics as card-stack expects
  - A `settings` shim (even if not fully supported) or a migration plan that removes all `settings` usage
- An `init` lifecycle that matches card-stack:
  - Automatically invoke the final class’ `init(...args)` during construction (not only mixin `init()`), or
  - Provide an opt-in mode that does so (to avoid surprising other consumers)
- A super-chain model for `init` (and potentially other methods):
  - Either linearize mixins into the prototype chain so `super.init()` works as it does under ts-mixer, or
  - Define and document a replacement pattern and refactor card-stack accordingly (higher effort)
- A safer default conflict policy (or a global/default strategy override):
  - For card-stack, “only last implementation runs” is generally safer than “execute all”.

## Validation checklist (card-stack focused)

Before switching card-stack to polymix, confirm these behaviors with a small spike:

- Construction + init:
  - `new (mix(Indexable, Parentable))(...)` assigns fields and runs the expected `init` hooks.
  - `Card.init(...)` (class-defined) runs automatically and sees the same args as the constructor.
- Type guards:
  - `isCard`, `isCardSet`, etc. continue to work correctly (including across `require(...)` boundaries).
- Decorator usage:
  - `@mix(CardSet, Indexable)`-style classes receive both prototypes and expected `instanceof`/hasMixin behavior.
- No duplicate side effects:
  - Any duplicated method names (especially `init`) do not run multiple times unexpectedly.
