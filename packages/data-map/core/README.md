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
store.batch(() => {
	store.set('$.user.name', 'Dana');
	store.set('$.user.email', 'dana@example.com');
});
```
