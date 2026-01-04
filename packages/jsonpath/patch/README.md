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

// Mutates doc by default for performance
applyPatch(doc, [{ op: 'add', path: '/baz', value: 'qux' }]);
// doc is now { foo: 'bar', baz: 'qux' }

// Use applyPatchImmutable for a non-mutating version
const next = applyPatchImmutable(doc, [{ op: 'remove', path: '/foo' }]);
// next is { baz: 'qux' }, doc remains unchanged
```

## Atomic Operations

You can ensure a patch is applied atomically (all or nothing) by passing `atomic: true` in options:

```ts
applyPatch(doc, patch, { atomic: true });
```

## RFC 6902 Compliance Testing

This package can execute the official upstream JSON Patch test suite.

See `RFC_COMPLIANCE.md` for how to run the suite and track deviations.
