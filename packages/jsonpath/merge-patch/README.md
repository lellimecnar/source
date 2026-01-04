# @jsonpath/merge-patch

RFC 7386 (JSON Merge Patch) implementation.

## Install

```bash
pnpm add @jsonpath/merge-patch
```

## Usage

### Applying a Patch

```ts
import { applyMergePatch } from '@jsonpath/merge-patch';

const target = { a: 'b', c: { d: 'e' } };
const patch = { a: 'z', c: { d: null } };

const result = applyMergePatch(target, patch);
// => { a: 'z', c: {} }
```

### Creating a Patch

```ts
import { createMergePatch } from '@jsonpath/merge-patch';

const source = { a: 'b' };
const target = { a: 'c', d: 'e' };

const patch = createMergePatch(source, target);
// => { a: 'c', d: 'e' }
```
