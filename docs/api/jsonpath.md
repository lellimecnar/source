# JSONPath API

This document provides an overview of the @jsonpath plugin-first JSONPath packages in this monorepo.

## Overview

The ecosystem is split into a small framework package (@jsonpath/core) and many wiring-only plugins.
The initial implementation focuses on scaffolding and stable public surfaces, not full RFC 9535 semantics.

## Key Packages

- @jsonpath/core: Engine framework (no JSONPath semantics)
- @jsonpath/plugin-rfc-9535: Preset wiring + createRfc9535Engine()
- @jsonpath/complete: Convenience re-export bundle
- @jsonpath/pointer, @jsonpath/patch, @jsonpath/mutate: Pointer/Patch/mutation utilities
- @jsonpath/plugin-validate + @jsonpath/validator-\*: Validation orchestration + adapters

## Example

```ts
import { createRfc9535Engine } from '@jsonpath/complete';

const engine = createRfc9535Engine();
const compiled = engine.compile('$.a');
const results = engine.evaluateSync(compiled, { a: 1 });
console.log(results);
```

## Commands

- Build: pnpm -w turbo build --filter=@jsonpath/\*
- Test: pnpm -w turbo test --filter @jsonpath/\* -- --passWithNoTests
- Verify exports: pnpm -w verify:exports
