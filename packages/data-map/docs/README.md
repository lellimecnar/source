# @data-map/core Documentation

> A reactive JSON data store with JSONPath/JSON Pointer access, RFC 6902 patches, subscriptions, and batching.

## Overview

`@data-map/core` provides a powerful, type-safe way to manage nested JSON data structures with:

- **Unified Path Access**: Use JSONPath (`$.user.name`) or JSON Pointer (`/user/name`) interchangeably
- **Immutable Updates**: All mutations are expressed as RFC 6902 JSON Patch operations
- **Reactive Subscriptions**: Watch for changes at any path with before/on/after lifecycle hooks
- **Batch Operations**: Group multiple mutations into atomic transactions
- **Dynamic Values**: Define computed getters, setters, and read-only fields
- **Deep Equality**: Built-in comparison utilities for complex data structures

## Documentation Index

### Getting Started

- [Quick Start](./getting-started/quick-start.md) - Installation and basic usage
- [Core Concepts](./getting-started/core-concepts.md) - Understanding paths, patches, and subscriptions

### Guides

- [Reading Data](./guides/reading-data.md) - Using `get()`, `getAll()`, and `resolve()`
- [Writing Data](./guides/writing-data.md) - Using `set()`, `setAll()`, `map()`, and `patch()`
- [Array Operations](./guides/array-operations.md) - `push()`, `pop()`, `splice()`, `sort()`, and more
- [Subscriptions](./guides/subscriptions.md) - Reactive change notifications
- [Batching & Transactions](./guides/batching.md) - Grouping operations atomically
- [Definitions](./guides/definitions.md) - Custom getters, setters, and computed values

### API Reference

- [DataMap Class](./api/datamap.md) - Complete API documentation
- [Types & Interfaces](./api/types.md) - TypeScript type definitions
- [Subscription Types](./api/subscriptions.md) - Subscription configuration and events
- [Definition Types](./api/definitions.md) - Definition configuration

### Architecture

- [Design Overview](./architecture/design-overview.md) - High-level architecture
- [Path System](./architecture/path-system.md) - How paths are detected, compiled, and matched
- [Patch System](./architecture/patch-system.md) - RFC 6902 implementation details
- [Subscription System](./architecture/subscription-system.md) - Event pipeline and matching

## Quick Example

```typescript
import { DataMap } from '@data-map/core';

// Create a store with initial data
const store = new DataMap({
	user: { name: 'Alice', age: 30 },
	settings: { theme: 'dark' },
});

// Read using JSON Pointer or JSONPath
store.get('/user/name'); // 'Alice'
store.get('$.user.name'); // 'Alice'

// Write with automatic patch generation
store.set('/user/name', 'Bob');

// Subscribe to changes
store.subscribe({
	path: '/user/name',
	on: 'patch',
	fn: (value, event) => {
		console.log(`Name changed to: ${value}`);
	},
});

// Batch multiple operations
store.batch((dm) => {
	dm.set('/user/name', 'Charlie');
	dm.set('/user/age', 31);
	// Notifications fire after the batch completes
});
```

## Key Dependencies

This package is built on top of [`json-p3`](https://github.com/jg-rp/json-p3), which provides:

- JSONPath query evaluation (RFC 9535)
- JSON Pointer resolution (RFC 6901)
- JSON Patch application (RFC 6902)

All path syntax and edge cases are determined by `json-p3`'s behavior.

## Package Information

| Property   | Value            |
| ---------- | ---------------- |
| Package    | `@data-map/core` |
| Version    | `0.1.0`          |
| License    | MIT              |
| Node       | `^24`            |
| TypeScript | `~5.5`           |
