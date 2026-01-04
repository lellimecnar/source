# @jsonpath/patch

RFC 6902 (JSON Patch) implementation used by the `@jsonpath/*` ecosystem.

## Install

```bash
pnpm add @jsonpath/patch
```

## Usage

```ts
import { applyPatch } from '@jsonpath/patch';

const doc = { foo: 'bar' };
const next = applyPatch(doc, [{ op: 'add', path: '/baz', value: 'qux' }]);
// => { foo: 'bar', baz: 'qux' }
```

## RFC 6902 Compliance Testing

This package can execute the official upstream JSON Patch test suite.

See `RFC_COMPLIANCE.md` for how to run the suite and track deviations.
