# @jsonpath/patch

RFC 6902 (JSON Patch) implementation used by the `@jsonpath/*` ecosystem.

## Install

```bash
pnpm add @jsonpath/patch
```

## Usage

```ts
import { applyPatch, applyPatchImmutable } from '@jsonpath/patch';

const doc = { foo: 'bar' };

// Mutates doc by default for performance (BREAKING change from v1.x)
applyPatch(doc, [{ op: 'add', path: '/baz', value: 'qux' }]);
// doc is now { foo: 'bar', baz: 'qux' }

// Use applyPatchImmutable for a non-mutating version
const next = applyPatchImmutable(doc, [{ op: 'remove', path: '/foo' }]);
// next is { baz: 'qux' }, doc remains unchanged

// For immutability in applyPatch, use structuredClone:
const immutable = applyPatch(structuredClone(doc), patch);
```

## Migration from v1.x

In v2.0+, `applyPatch` **mutates the target by default** for performance. If you depend on immutability:

**Before (v1.x):**

```ts
const next = applyPatch(doc, patch); // doc was not mutated
```

**After (v2.0+):**

```ts
const next = applyPatch(structuredClone(doc), patch); // explicit clone for immutability
```

Or use `applyPatchImmutable` which always creates a new object.

## Atomic Operations

You can ensure a patch is applied atomically (all or nothing) by passing `atomicApply: true` in options:

```ts
applyPatch(doc, patch, { atomicApply: true });
// If any operation fails, the entire patch is rolled back
```

This is useful when you need guarantee that either the entire patch succeeds or the document is unchanged.

## RFC 6902 Compliance Testing

This package can execute the official upstream JSON Patch test suite.

See `RFC_COMPLIANCE.md` for how to run the suite and track deviations.
