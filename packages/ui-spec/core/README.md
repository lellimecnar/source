# @ui-spec/core

Framework-agnostic core runtime for UI-Spec:

- JSONPath reads via `json-p3` (RFC 9535)
- JSON Patch mutations via `json-p3` (RFC 6902)
- Observable store with subscription support
- Action and Component registries
- Node resolution logic

## Usage

```typescript
import { createUISpecStore } from '@ui-spec/core';

const store = createUISpecStore({
	count: 0,
	user: { name: 'Alice' },
});

// Read via JSONPath
const name = store.get('$.user.name');

// Subscribe to changes
store.subscribe(() => {
	console.log('Store updated:', store.getDocument());
});

// Mutate via JSON Patch
store.patch([{ op: 'replace', path: '/count', value: 1 }]);

// Helper methods
store.set('$.count', 2);
store.update('$.count', (v) => v + 1);
```

This package intentionally does not depend on React or any component library.
