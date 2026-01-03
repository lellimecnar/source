# AGENTS.md - @data-map/core

Core DataMap implementation.

- Build: `pnpm turbo -F @data-map/core build`
- Test: `pnpm turbo -F @data-map/core test`
- Type-check: `pnpm turbo -F @data-map/core type-check`

This package MUST use `json-p3` as the sole JSONPath/Pointer/Patch engine.

## Testing Conventions

### Test Location

- Unit tests: Co-located with source files (`*.spec.ts`)
- Integration tests: `src/__tests__/integration.spec.ts`
- Error tests: `src/__tests__/errors.spec.ts`
- Spec compliance: `src/__tests__/spec-compliance.spec.ts`

### Shared Fixtures

Import from `__fixtures__/`:

```ts
import {
	createDataMap,
	createEventSpy,
	flushMicrotasks,
} from './__fixtures__/helpers';
import { complexData } from './__fixtures__/data';
```

### Running Tests

```bash
pnpm --filter @data-map/core test           # Run once
pnpm --filter @data-map/core test:watch     # Watch mode
pnpm --filter @data-map/core test:coverage  # With coverage
```

### Coverage Requirements

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 90%       |
| Lines      | 90%       |
| Branches   | 85%       |
| Functions  | 95%       |
