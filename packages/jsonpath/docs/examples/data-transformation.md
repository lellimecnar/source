# Data Transformation Examples

Transform, reshape, and manipulate JSON data.

## Setup

```typescript
import { transform, pick, omit, project, query } from '@jsonpath/jsonpath';
import { set, remove } from '@jsonpath/pointer';
import { applyPatch, diff, PatchBuilder } from '@jsonpath/patch';
```

---

## Transform Values

### Modify Matched Values

```typescript
const data = {
	products: [
		{ name: 'Laptop', price: 999 },
		{ name: 'Mouse', price: 29 },
		{ name: 'Keyboard', price: 79 },
	],
};

// Apply 10% discount to all prices
const discounted = transform(
	data,
	'$.products[*].price',
	(price) => price * 0.9,
);
// {
//   products: [
//     { name: 'Laptop', price: 899.1 },
//     { name: 'Mouse', price: 26.1 },
//     { name: 'Keyboard', price: 71.1 }
//   ]
// }
```

### Normalize Strings

```typescript
const users = {
	list: [
		{ name: '  john doe  ', email: 'JOHN@EXAMPLE.COM' },
		{ name: 'Jane Smith', email: 'jane@EXAMPLE.com' },
	],
};

// Trim and capitalize names
const normalized = transform(users, '$.list[*].name', (name) =>
	name
		.trim()
		.split(' ')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(' '),
);

// Lowercase emails
const final = transform(normalized, '$.list[*].email', (email) =>
	email.toLowerCase(),
);
```

### Convert Types

```typescript
const records = {
	items: [
		{ id: '001', value: '123.45' },
		{ id: '002', value: '67.89' },
	],
};

// Convert string values to numbers
const converted = transform(records, '$.items[*].value', (val) =>
	parseFloat(val),
);
```

---

## Reshape Data

### Pick Specific Fields

```typescript
const users = [
	{ id: 1, name: 'Alice', email: 'a@x.com', password: 'secret', ssn: '123' },
	{ id: 2, name: 'Bob', email: 'b@x.com', password: 'secret', ssn: '456' },
];

// Keep only public fields
const publicData = project(users, ['id', 'name', 'email']);
// [
//   { id: 1, name: 'Alice', email: 'a@x.com' },
//   { id: 2, name: 'Bob', email: 'b@x.com' }
// ]
```

### Pick from Nested Objects

```typescript
const data = {
	response: {
		users: [
			{
				id: 1,
				profile: { name: 'Alice', age: 30 },
				settings: { theme: 'dark' },
			},
			{
				id: 2,
				profile: { name: 'Bob', age: 25 },
				settings: { theme: 'light' },
			},
		],
	},
};

// Keep only id and profile.name
const simplified = pick(data, '$.response.users[*]', ['id', 'profile']);
```

### Omit Sensitive Fields

```typescript
const userData = {
	user: {
		id: 1,
		name: 'Alice',
		password: 'hashed',
		creditCard: '4111...',
		preferences: { theme: 'dark' },
	},
};

// Remove sensitive fields
const safe = omit(userData, '$.user', ['password', 'creditCard']);
// {
//   user: { id: 1, name: 'Alice', preferences: { theme: 'dark' } }
// }
```

---

## Structural Changes

### Using JSON Pointer

```typescript
const config = {
	database: {
		host: 'localhost',
		port: 5432,
	},
};

// Add a property
const withUser = set(config, '/database/user', 'admin');

// Modify a property
const withNewPort = set(config, '/database/port', 3306);

// Remove a property
const withoutHost = remove(config, '/database/host');
```

### Using JSON Patch

```typescript
const data = { name: 'App', version: '1.0.0' };

const patch = [
	{ op: 'replace', path: '/version', value: '1.1.0' },
	{ op: 'add', path: '/description', value: 'My application' },
	{ op: 'add', path: '/keywords', value: ['app', 'example'] },
];

const updated = applyPatch(data, patch);
// {
//   name: 'App',
//   version: '1.1.0',
//   description: 'My application',
//   keywords: ['app', 'example']
// }
```

### Using PatchBuilder

```typescript
const data = { users: [{ id: 1, name: 'Alice' }] };

const patch = new PatchBuilder()
	.add('/users/-', { id: 2, name: 'Bob' })
	.replace('/users/0/name', 'Alicia')
	.add('/metadata', { created: Date.now() })
	.build();

const result = applyPatch(data, patch);
```

---

## Complex Transformations

### Flatten Nested Structure

```typescript
const nested = {
	departments: [
		{
			name: 'Engineering',
			teams: [
				{ name: 'Frontend', members: ['Alice', 'Bob'] },
				{ name: 'Backend', members: ['Carol', 'Dave'] },
			],
		},
		{
			name: 'Design',
			teams: [{ name: 'UX', members: ['Eve'] }],
		},
	],
};

// Extract all members with their context
interface FlatMember {
	department: string;
	team: string;
	member: string;
}

function flattenMembers(data: typeof nested): FlatMember[] {
	const result: FlatMember[] = [];

	for (const dept of data.departments) {
		for (const team of dept.teams) {
			for (const member of team.members) {
				result.push({
					department: dept.name,
					team: team.name,
					member,
				});
			}
		}
	}

	return result;
}

// Or using JSONPath to find all members
const allMembers = query(nested, '$..members[*]').values();
// ['Alice', 'Bob', 'Carol', 'Dave', 'Eve']
```

### Denormalize Data

```typescript
const normalized = {
	users: {
		'1': { id: 1, name: 'Alice' },
		'2': { id: 2, name: 'Bob' },
	},
	posts: [
		{ id: 101, title: 'Hello', authorId: 1 },
		{ id: 102, title: 'World', authorId: 2 },
	],
};

// Denormalize posts with author data
const denormalized = normalized.posts.map((post) => ({
	...post,
	author: normalized.users[post.authorId],
}));
```

### Merge Configurations

```typescript
import { applyMergePatch } from '@jsonpath/merge-patch';

const defaults = {
	server: { host: 'localhost', port: 3000 },
	database: { host: 'localhost', port: 5432 },
	logging: { level: 'info', format: 'json' },
};

const overrides = {
	server: { port: 8080 },
	logging: { level: 'debug' },
};

const config = applyMergePatch(defaults, overrides);
// {
//   server: { host: 'localhost', port: 8080 },
//   database: { host: 'localhost', port: 5432 },
//   logging: { level: 'debug', format: 'json' }
// }
```

---

## Computed Fields

### Add Calculated Properties

```typescript
const orders = {
	items: [
		{ product: 'A', quantity: 2, unitPrice: 10 },
		{ product: 'B', quantity: 3, unitPrice: 15 },
	],
};

// Add total to each item
const withTotals = {
	...orders,
	items: orders.items.map((item) => ({
		...item,
		total: item.quantity * item.unitPrice,
	})),
};

// Add order total
const withOrderTotal = {
	...withTotals,
	orderTotal: withTotals.items.reduce((sum, item) => sum + item.total, 0),
};
```

### Derive Status Fields

```typescript
const inventory = {
	products: [
		{ name: 'A', stock: 100, reorderPoint: 50 },
		{ name: 'B', stock: 10, reorderPoint: 50 },
		{ name: 'C', stock: 0, reorderPoint: 20 },
	],
};

// Add status based on stock level
const withStatus = {
	...inventory,
	products: inventory.products.map((p) => ({
		...p,
		status:
			p.stock === 0
				? 'out-of-stock'
				: p.stock < p.reorderPoint
					? 'low-stock'
					: 'in-stock',
	})),
};
```

---

## Batch Transformations

### Apply Multiple Patches

```typescript
const patches = [
	{ path: '/users/0/status', value: 'active' },
	{ path: '/users/1/status', value: 'inactive' },
	{ path: '/metadata/updated', value: Date.now() },
];

let data = initialData;
for (const { path, value } of patches) {
	data = set(data, path, value);
}
```

### Transform with Diff

```typescript
// Get changes between versions
const v1 = { name: 'App', version: '1.0.0', enabled: true };
const v2 = { name: 'App', version: '2.0.0', enabled: true, newFeature: true };

const changes = diff(v1, v2);
// [
//   { op: 'replace', path: '/version', value: '2.0.0' },
//   { op: 'add', path: '/newFeature', value: true }
// ]

// Apply same changes to another document
const v1Copy = { name: 'App', version: '1.0.0', enabled: false };
const v2Copy = applyPatch(v1Copy, changes);
// { name: 'App', version: '2.0.0', enabled: false, newFeature: true }
```

---

## Pipeline Pattern

### Chain Transformations

```typescript
class DataPipeline<T> {
	constructor(private data: T) {}

	transform(path: string, fn: (v: any) => any): DataPipeline<T> {
		return new DataPipeline(transform(this.data, path, fn) as T);
	}

	patch(operations: any[]): DataPipeline<T> {
		return new DataPipeline(applyPatch(this.data, operations) as T);
	}

	set(path: string, value: any): DataPipeline<T> {
		return new DataPipeline(set(this.data, path, value) as T);
	}

	result(): T {
		return this.data;
	}
}

// Use the pipeline
const result = new DataPipeline(initialData)
	.transform('$.items[*].price', (p) => p * 0.9)
	.set('/metadata/processed', true)
	.patch([{ op: 'add', path: '/version', value: '2.0' }])
	.result();
```
