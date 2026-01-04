# API Integration Examples

Working with REST APIs and JSON data.

## Setup

```typescript
import {
	query,
	value,
	exists,
	count,
	pick,
	omit,
	transform,
} from '@jsonpath/jsonpath';
```

---

## Response Parsing

### Extract Nested Data

```typescript
// Typical API response
const response = {
	status: 'success',
	data: {
		user: {
			id: 123,
			profile: {
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
			},
		},
	},
	meta: {
		timestamp: '2024-01-15T10:30:00Z',
	},
};

// Extract user data
const user = value(response, '$.data.user');

// Get specific fields
const email = value(response, '$.data.user.profile.email');
const timestamp = value(response, '$.meta.timestamp');
```

### Handle Paginated Responses

```typescript
interface PagedResponse<T> {
	data: T[];
	pagination: {
		page: number;
		perPage: number;
		total: number;
		totalPages: number;
	};
}

function getItems<T>(response: PagedResponse<T>): T[] {
	return query(response, '$.data[*]').values() as T[];
}

function hasMorePages(response: PagedResponse<any>): boolean {
	const page = value(response, '$.pagination.page') as number;
	const totalPages = value(response, '$.pagination.totalPages') as number;
	return page < totalPages;
}

async function fetchAllPages<T>(
	fetchPage: (page: number) => Promise<PagedResponse<T>>,
): Promise<T[]> {
	const allItems: T[] = [];
	let page = 1;

	while (true) {
		const response = await fetchPage(page);
		allItems.push(...getItems(response));

		if (!hasMorePages(response)) break;
		page++;
	}

	return allItems;
}
```

### Handle API Errors

```typescript
interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		details?: Record<string, string[]>;
	};
}

function handleResponse<T>(response: ApiResponse<T>): T {
	if (!response.success) {
		const code = value(response, '$.error.code') ?? 'UNKNOWN';
		const message = value(response, '$.error.message') ?? 'An error occurred';
		throw new Error(`${code}: ${message}`);
	}

	return response.data!;
}

function getValidationErrors(
	response: ApiResponse<any>,
): Record<string, string[]> {
	if (exists(response, '$.error.details')) {
		return value(response, '$.error.details');
	}
	return {};
}
```

---

## Request Building

### Build Query Parameters

```typescript
interface SearchFilters {
	status?: string[];
	minPrice?: number;
	maxPrice?: number;
	categories?: string[];
}

function buildQueryParams(filters: SearchFilters): URLSearchParams {
	const params = new URLSearchParams();

	if (filters.status?.length) {
		params.set('status', filters.status.join(','));
	}
	if (filters.minPrice !== undefined) {
		params.set('min_price', String(filters.minPrice));
	}
	if (filters.maxPrice !== undefined) {
		params.set('max_price', String(filters.maxPrice));
	}
	if (filters.categories?.length) {
		params.set('categories', filters.categories.join(','));
	}

	return params;
}
```

### Prepare Request Body

```typescript
import { omit } from '@jsonpath/jsonpath';

interface UserForm {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	confirmPassword: string;
	terms: boolean;
}

function prepareUserPayload(form: UserForm) {
	// Remove client-only fields
	const payload = omit({ user: form }, '$.user', ['confirmPassword', 'terms']);

	return value(payload, '$.user');
}
```

---

## Data Normalization

### Flatten Nested Responses

```typescript
const apiResponse = {
	orders: [
		{
			id: 1,
			customer: { id: 'c1', name: 'Alice' },
			items: [
				{ productId: 'p1', quantity: 2 },
				{ productId: 'p2', quantity: 1 },
			],
		},
		{
			id: 2,
			customer: { id: 'c2', name: 'Bob' },
			items: [{ productId: 'p1', quantity: 3 }],
		},
	],
};

// Extract unique customer IDs
const customerIds = [
	...new Set(
		query(apiResponse, '$.orders[*].customer.id').values() as string[],
	),
];
// ['c1', 'c2']

// Extract unique product IDs
const productIds = [
	...new Set(
		query(apiResponse, '$.orders[*].items[*].productId').values() as string[],
	),
];
// ['p1', 'p2']
```

### Normalize for Redux/State

```typescript
interface NormalizedState {
	entities: {
		users: Record<string, any>;
		posts: Record<string, any>;
		comments: Record<string, any>;
	};
	ids: {
		users: string[];
		posts: string[];
		comments: string[];
	};
}

function normalizeResponse(response: any): Partial<NormalizedState> {
	const users = query(response, '$..author').values();
	const posts = query(response, '$.posts[*]').values();

	return {
		entities: {
			users: Object.fromEntries(users.map((u: any) => [u.id, u])),
			posts: Object.fromEntries(posts.map((p: any) => [p.id, p])),
			comments: {},
		},
		ids: {
			users: users.map((u: any) => u.id),
			posts: posts.map((p: any) => p.id),
			comments: [],
		},
	};
}
```

---

## Response Transformation

### Map to DTOs

```typescript
// API returns snake_case
const apiUser = {
	user_id: 123,
	first_name: 'John',
	last_name: 'Doe',
	email_address: 'john@example.com',
	created_at: '2024-01-15T10:30:00Z',
};

// Transform to camelCase DTO
interface UserDTO {
	userId: number;
	firstName: string;
	lastName: string;
	emailAddress: string;
	createdAt: Date;
}

function toUserDTO(apiUser: any): UserDTO {
	return {
		userId: value(apiUser, '$.user_id'),
		firstName: value(apiUser, '$.first_name'),
		lastName: value(apiUser, '$.last_name'),
		emailAddress: value(apiUser, '$.email_address'),
		createdAt: new Date(value(apiUser, '$.created_at')),
	};
}
```

### Enrich Response Data

```typescript
const products = {
	items: [
		{ id: 1, name: 'Widget', price: 9.99, stock: 100 },
		{ id: 2, name: 'Gadget', price: 19.99, stock: 5 },
		{ id: 3, name: 'Gizmo', price: 29.99, stock: 0 },
	],
};

// Add computed fields
const enriched = {
	...products,
	items: products.items.map((item) => ({
		...item,
		available: item.stock > 0,
		lowStock: item.stock > 0 && item.stock < 10,
		formattedPrice: `$${item.price.toFixed(2)}`,
	})),
};
```

### Filter Sensitive Data

```typescript
// Before sending to client
function sanitizeForClient(response: any) {
	return omit(response, '$..user', [
		'passwordHash',
		'twoFactorSecret',
		'apiKey',
		'ssn',
	]);
}

// For logging
function sanitizeForLogging(request: any) {
	return transform(request, '$..password', () => '[REDACTED]');
}
```

---

## GraphQL-like Field Selection

### Implement Field Projection

```typescript
type FieldSelection = string | { [key: string]: FieldSelection[] };

function projectFields(data: any, fields: FieldSelection[]): any {
	if (Array.isArray(data)) {
		return data.map((item) => projectFields(item, fields));
	}

	if (typeof data !== 'object' || data === null) {
		return data;
	}

	const result: any = {};

	for (const field of fields) {
		if (typeof field === 'string') {
			if (field in data) {
				result[field] = data[field];
			}
		} else {
			for (const [key, subFields] of Object.entries(field)) {
				if (key in data) {
					result[key] = projectFields(data[key], subFields);
				}
			}
		}
	}

	return result;
}

// Usage
const user = {
	id: 1,
	name: 'John',
	email: 'john@example.com',
	profile: {
		avatar: 'url',
		bio: 'Hello',
		settings: { theme: 'dark' },
	},
};

const projected = projectFields(user, [
	'id',
	'name',
	{ profile: ['avatar', 'bio'] },
]);
// { id: 1, name: 'John', profile: { avatar: 'url', bio: 'Hello' } }
```

---

## API Client Wrapper

```typescript
import { query, value, exists } from '@jsonpath/jsonpath';

class ApiClient {
	constructor(private baseUrl: string) {}

	async get<T>(path: string, options?: { select?: string }): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`);
		const data = await response.json();

		if (!response.ok) {
			const error = value(data, '$.error.message') ?? 'Request failed';
			throw new Error(error);
		}

		// Apply JSONPath selection if provided
		if (options?.select) {
			return query(data, options.select).values() as T;
		}

		return data;
	}

	async post<T>(path: string, body: any): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});
		return response.json();
	}
}

// Usage
const api = new ApiClient('https://api.example.com');

// Get all user names
const names = await api.get('/users', { select: '$.data[*].name' });

// Get first user's email
const email = await api.get('/users/1', { select: '$.data.email' });
```

---

## Webhook Processing

```typescript
interface WebhookPayload {
	event: string;
	timestamp: string;
	data: any;
}

function processWebhook(payload: WebhookPayload) {
	const event = value(payload, '$.event');

	switch (event) {
		case 'user.created':
			const userId = value(payload, '$.data.user.id');
			const email = value(payload, '$.data.user.email');
			return handleUserCreated(userId, email);

		case 'order.completed':
			const orderId = value(payload, '$.data.order.id');
			const total = value(payload, '$.data.order.total');
			const items = query(payload, '$.data.order.items[*]').values();
			return handleOrderCompleted(orderId, total, items);

		case 'payment.failed':
			const errorCode = value(payload, '$.data.error.code');
			return handlePaymentFailed(errorCode);

		default:
			console.log(`Unknown event: ${event}`);
	}
}
```
