# Subscription System

Event-driven change notification architecture in `@data-map/core`.

## Overview

The subscription system provides:

- Fine-grained path-based subscriptions
- Support for static (pointer) and dynamic (JSONPath) patterns
- Priority-based execution ordering
- Bloom filter optimization for fast negative lookup
- Batched notification deferral

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SubscriptionManagerImpl                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │   Static Registry    │  │       Dynamic Registry           │ │
│  │                      │  │                                  │ │
│  │  Map<pointer, Set<   │  │  Map<pattern, {                  │ │
│  │    SubscriptionEntry │  │    compiled: CompiledPattern,    │ │
│  │  >>                  │  │    subs: Set<SubscriptionEntry>  │ │
│  │                      │  │  }>                              │ │
│  └──────────┬───────────┘  └─────────────┬────────────────────┘ │
│             │                            │                      │
│             └────────────┬───────────────┘                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Bloom Filter                            ││
│  │           (fast negative lookup for pointers)               ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   Notification Queue                        ││
│  │         (priority-sorted, batched when active)              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Subscription Entry

```typescript
interface SubscriptionEntry<T, Ctx> {
	id: string;
	path: string;
	event: SubscriptionEvent;
	handler: SubscriptionHandler<T, Ctx>;
	priority: number;
	filter?: (event: SubscriptionEventInfo<T, Ctx>) => boolean;
	compiled?: CompiledPattern;
}
```

## Registration Flow

```
subscribe({ path: '$.users[*].name', on: 'patch', fn: handler })
    │
    ▼
detectPathType(path)
    │
    ├── 'pointer' → Add to static registry
    │
    └── 'jsonpath' → Compile pattern, add to dynamic registry
    │
    ▼
Update Bloom filter with path/pattern
    │
    ▼
Return Subscription handle
```

### Static Subscriptions

For JSON Pointer paths:

```typescript
// Registration
subscribe({ path: '/users/0/name', on: 'patch', fn: handler });

// Internal storage
staticRegistry.get('/users/0/name').add(entry);
```

**Matching**: Exact pointer match or child path match.

```typescript
// Subscription: /users/0
// Matches:
//   /users/0         (exact)
//   /users/0/name    (child)
//   /users/0/a/b/c   (descendant)
// Does not match:
//   /users/1         (sibling)
//   /users           (parent)
```

### Dynamic Subscriptions

For JSONPath patterns:

```typescript
// Registration
subscribe({ path: '$.users[*].name', on: 'patch', fn: handler });

// Internal storage
dynamicRegistry.set('$.users[*].name', {
	compiled: compilePathPattern('$.users[*].name'),
	subs: new Set([entry]),
});
```

**Matching**: Pattern matching against concrete pointers.

```typescript
// Subscription: $.users[*].name
// Matches:
//   /users/0/name
//   /users/1/name
//   /users/999/name
// Does not match:
//   /users/0/email
//   /users/0
```

## Notification Flow

```
set('/users/0/name', 'Alice')
    │
    ▼
applyOperations() → data updated
    │
    ▼
BatchManager.isActive()?
    │
    ├── Yes → Queue notification, defer
    │
    └── No → Continue
    │
    ▼
BloomFilter.mightContain('/users/0/name')?
    │
    ├── No → Skip (fast path)
    │
    └── Yes → Continue
    │
    ▼
Find matching subscriptions
    │
    ├── Check static registry for /users/0/name and ancestors
    │
    └── Check dynamic registry patterns
    │
    ▼
Sort by priority (ascending)
    │
    ▼
Execute handlers in order
    │
    ├── Apply filter (skip if returns false)
    │
    └── Call handler(value, eventInfo)
```

## Bloom Filter Optimization

### Purpose

Fast O(1) check if any subscriptions might match a pointer:

```typescript
if (!bloomFilter.mightContain(pointer)) {
	return; // Definitely no subscribers
}
// Might have subscribers, do full check
```

### Implementation

```typescript
class BloomFilter {
	private _bits: Uint8Array;
	private _hashCount: number;

	add(value: string): void {
		for (const hash of this.hashes(value)) {
			this._bits[hash % this._bits.length] = 1;
		}
	}

	mightContain(value: string): boolean {
		for (const hash of this.hashes(value)) {
			if (this._bits[hash % this._bits.length] === 0) {
				return false;
			}
		}
		return true; // Might be false positive
	}
}
```

### False Positive Handling

Bloom filters can have false positives (never false negatives):

```typescript
if (bloomFilter.mightContain(pointer)) {
	// Do full pattern matching
	const matches = findMatchingSubscriptions(pointer);
	if (matches.length > 0) {
		notifySubscribers(matches);
	}
	// False positive: no harm, just wasted computation
}
```

## Priority Execution

Subscriptions execute in priority order (lower first):

```typescript
const sorted = [...matchingEntries].sort((a, b) => a.priority - b.priority);

for (const entry of sorted) {
	await executeHandler(entry);
}
```

### Use Cases

```typescript
// Logging runs first (priority -100)
store.subscribe({
	path: '/data',
	on: 'patch',
	priority: -100,
	fn: (v) => console.log('Change:', v),
});

// Validation runs second (priority -50)
store.subscribe({
	path: '/data',
	on: 'patch',
	priority: -50,
	fn: (v) => validate(v),
});

// UI update runs last (default priority 0)
store.subscribe({
	path: '/data',
	on: 'patch',
	fn: (v) => updateUI(v),
});
```

## Batched Notifications

### Behavior

During a batch, notifications are collected and fired once:

```typescript
store.batch((dm) => {
	dm.set('/a', 1); // Notification deferred
	dm.set('/b', 2); // Notification deferred
	dm.set('/c', 3); // Notification deferred
});
// All notifications fire now
```

### Implementation

```typescript
class SubscriptionManagerImpl {
	private _pendingNotifications: NotificationEntry[] = [];

	notify(pointer: string, event: SubscriptionEvent, info: EventInfo): void {
		if (this._batchManager.isActive()) {
			this._pendingNotifications.push({ pointer, event, info });
			return;
		}

		this.executeNotification(pointer, event, info);
	}

	flushBatch(): void {
		const pending = this._pendingNotifications;
		this._pendingNotifications = [];

		// Deduplicate and merge notifications
		const merged = this.mergeNotifications(pending);

		for (const notification of merged) {
			this.executeNotification(
				notification.pointer,
				notification.event,
				notification.info,
			);
		}
	}
}
```

### Notification Merging

Multiple changes to the same path are merged:

```typescript
// During batch:
set('/count', 1); // pending: [{ path: '/count', value: 1 }]
set('/count', 2); // pending: [{ path: '/count', value: 1 }, { path: '/count', value: 2 }]
set('/count', 3); // pending: [{ path: '/count', value: 1 }, { path: '/count', value: 2 }, { path: '/count', value: 3 }]

// After batch, merged to:
notify('/count', 3, { previousValue: 0 }); // Only final value, original previousValue
```

## Dynamic Re-expansion

### The Problem

When structure changes, dynamic patterns may match new or different paths:

```typescript
// Subscription: $.users[*].name
// Data: { users: [{ name: 'Alice' }] }
// Expanded paths: ['/users/0/name']

store.push('/users', { name: 'Bob' });

// Now should also match: /users/1/name
```

### The Solution

Track structural changes and re-expand patterns:

```typescript
function handleStructuralChange(pointer: string): void {
	const affectedPatterns = findPatternsMatchingAncestor(pointer);

	for (const pattern of affectedPatterns) {
		const oldPaths = pattern.expandedPaths;
		const newPaths = expandPattern(pattern.original, currentData);

		// Notify new paths
		for (const path of newPaths) {
			if (!oldPaths.has(path)) {
				notifyNewPath(pattern, path);
			}
		}

		pattern.expandedPaths = newPaths;
	}
}
```

### Structural Change Detection

```typescript
function isStructuralChange(op: Operation): boolean {
	switch (op.op) {
		case 'add':
		case 'remove':
			return true; // Array/object membership changed
		case 'replace':
			// Structural if replacing with different type
			return typeof op.value !== typeof getPreviousValue(op.path);
		default:
			return false;
	}
}
```

## Event Types

### patch

Fires after data changes:

```typescript
store.subscribe({
	path: '/user',
	on: 'patch',
	fn: (value, event) => {
		console.log('New:', value);
		console.log('Old:', event.previousValue);
		console.log('Ops:', event.operations);
	},
});
```

### read

Fires when data is accessed:

```typescript
store.subscribe({
	path: '/user',
	on: 'read',
	fn: (value, event) => {
		console.log('Read:', event.pointer);
		analytics.track('data_access', { path: event.pointer });
	},
});
```

### set

Fires before data is written (for interception):

```typescript
store.subscribe({
	path: '/user',
	on: 'set',
	fn: (value, event) => {
		console.log('About to set:', value);
	},
});
```

## Filter Functions

Skip handler execution conditionally:

```typescript
store.subscribe({
	path: '/count',
	on: 'patch',
	filter: (event) => {
		// Only notify for significant changes
		const oldVal = event.previousValue as number;
		const newVal = event.value as number;
		return Math.abs(newVal - oldVal) > 10;
	},
	fn: (value) => {
		console.log('Significant change:', value);
	},
});
```

## Cleanup

### Unsubscribe

```typescript
const sub = store.subscribe({ ... });

// Later
sub.unsubscribe();
```

### Implementation

```typescript
unsubscribe(): void {
  // Remove from registry
  if (this._entry.compiled) {
    dynamicRegistry.get(this._entry.path)?.subs.delete(this._entry);
  } else {
    staticRegistry.get(this._entry.path)?.delete(this._entry);
  }

  // Note: Bloom filter not updated (acceptable false positives)
}
```

## Performance Characteristics

| Operation     | Complexity | Notes                              |
| ------------- | ---------- | ---------------------------------- |
| Subscribe     | O(1)       | Plus pattern compilation           |
| Unsubscribe   | O(1)       | Map/Set removal                    |
| Bloom check   | O(k)       | k = hash functions                 |
| Static match  | O(d)       | d = path depth                     |
| Dynamic match | O(p × d)   | p = patterns, d = depth            |
| Batch flush   | O(n × m)   | n = notifications, m = subscribers |

## See Also

- [Architecture Overview](./design-overview.md)
- [Path System](./path-system.md)
- [Subscriptions Guide](../guides/subscriptions.md)
