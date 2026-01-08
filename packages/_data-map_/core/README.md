---
post_title: '@data-map/core'
author1: 'lmiller'
post_slug: 'data-map-core'
microsoft_alias: 'lmiller'
featured_image: ''
categories:
  - 'Developer Tools'
tags:
  - 'datamap'
  - 'jsonpath'
  - 'json-pointer'
ai_note: 'AI-assisted'
summary: 'Reactive JSON store with JSONPath/JSON Pointer access, RFC6902 patches, subscriptions, and batching.'
post_date: '2026-01-03'
---

## Overview

`@data-map/core` is a reactive data store built on top of `json-p3`.

## Quick Start

```ts
import { DataMap } from '@data-map/core';

const store = new DataMap({ user: { name: 'Alice' } });
store.set('$.user.name', 'Bob');
console.log(store.get('/user/name')); // "Bob"
```

## Subscriptions

```ts
const sub = store.subscribe({
	path: '/user/name',
	on: 'patch',
	fn: (value, event) => {
		console.log('changed', event.pointer, value);
	},
});

store.set('/user/name', 'Charlie');
sub.unsubscribe();
```

## Batch

```ts
// Callback-based batch API
store.batch((dm) => {
	dm.set('/user/name', 'Dana');
	dm.set('/user/email', 'dana@example.com');
});
// Notifications fire after batch completes
```

## Computed Properties & Definitions

```ts
const store = new DataMap(
	{ birthYear: 1990 },
	{
		define: [
			{
				path: '$.age',
				get: (val, [birthYear], dm, ctx) => ctx.currentYear - birthYear,
				deps: ['/birthYear'],
				readOnly: true,
			},
		],
		context: { currentYear: 2026 },
	},
);

console.log(store.get('$.age')); // 36
store.set('/birthYear', 2000);
console.log(store.get('$.age')); // 26 (auto-updated via deps)
```

## Read Interception

```ts
store.subscribe({
	path: '/secret',
	before: 'get',
	fn: (val) => '********',
});

console.log(store.get('/secret')); // "********"
```
