# Security Guide

> Best practices for safe JSONPath usage in production.

## Overview

JSONPath queries can pose security risks if not handled properly:

- **Denial of Service**: Complex queries can consume excessive resources
- **Data Leakage**: Overly permissive queries may expose sensitive data
- **Injection Attacks**: User-provided queries without validation

This guide covers mitigation strategies.

---

## Resource Limits

### Configure Limits

Always set resource limits in production:

```typescript
import { configure } from '@jsonpath/jsonpath';

configure({
	maxResults: 10000, // Maximum results returned
	maxDepth: 64, // Maximum recursion depth
	maxInputSize: 10_000_000, // Maximum input size (bytes)
	timeout: 5000, // Query timeout (ms)
});
```

### Per-Query Limits

Override defaults for specific queries:

```typescript
import { query } from '@jsonpath/jsonpath';

const result = query(data, '$.items[*]', {
	maxResults: 100,
	timeout: 1000,
});
```

### Limit Errors

Handle limit errors gracefully:

```typescript
import { JSONPathLimitError, JSONPathTimeoutError } from '@jsonpath/core';

try {
	const result = query(data, '$..[*]');
} catch (err) {
	if (err instanceof JSONPathLimitError) {
		return { error: 'Query returned too many results' };
	}
	if (err instanceof JSONPathTimeoutError) {
		return { error: 'Query took too long' };
	}
	throw err;
}
```

---

## Query Validation

### Validate User Queries

Never execute user-provided queries without validation:

```typescript
import { parse } from '@jsonpath/parser';
import { JSONPathSyntaxError } from '@jsonpath/core';

function validateQuery(queryString: string): {
	valid: boolean;
	error?: string;
} {
	// Check length
	if (queryString.length > 500) {
		return { valid: false, error: 'Query too long' };
	}

	// Check for dangerous patterns
	const dangerousPatterns = [
		/\$\.\./, // Recursive descent
		/\[\*\]/, // Wildcard in arrays
	];

	for (const pattern of dangerousPatterns) {
		if (pattern.test(queryString)) {
			return { valid: false, error: 'Query contains restricted patterns' };
		}
	}

	// Validate syntax
	try {
		parse(queryString);
		return { valid: true };
	} catch (err) {
		if (err instanceof JSONPathSyntaxError) {
			return { valid: false, error: 'Invalid syntax' };
		}
		throw err;
	}
}
```

### Allowlist Approach

For maximum security, use an allowlist of permitted queries:

```typescript
const ALLOWED_QUERIES = new Set([
	'$.user.name',
	'$.user.email',
	'$.items[*].id',
	'$.items[*].name',
]);

function safeQuery(data: any, queryString: string) {
	if (!ALLOWED_QUERIES.has(queryString)) {
		throw new Error('Query not permitted');
	}
	return query(data, queryString);
}
```

### Query Complexity Analysis

Estimate query complexity before execution:

```typescript
import { parse, walk } from '@jsonpath/parser';

function estimateComplexity(queryString: string): number {
	const ast = parse(queryString);
	let score = 0;

	walk(ast, (node) => {
		switch (node.type) {
			case 'RecursiveDescent':
				score += 100; // Expensive
				break;
			case 'Wildcard':
				score += 10;
				break;
			case 'Filter':
				score += 20;
				break;
			case 'Slice':
				score += 5;
				break;
			default:
				score += 1;
		}
	});

	return score;
}

// Reject complex queries
const MAX_COMPLEXITY = 50;
const complexity = estimateComplexity(userQuery);
if (complexity > MAX_COMPLEXITY) {
	throw new Error('Query too complex');
}
```

---

## Preventing Injection

### Parameterized Queries

Build queries safely with parameters:

```typescript
// ❌ Dangerous: String interpolation
const query = `$.users[?@.id == ${userId}]`;

// ✅ Safe: Validate and escape
function buildUserQuery(userId: unknown): string {
	if (typeof userId !== 'number' || !Number.isInteger(userId)) {
		throw new Error('Invalid user ID');
	}
	return `$.users[?@.id == ${userId}]`;
}
```

### Escaping String Values

When including user strings in queries:

```typescript
function escapeString(value: string): string {
	// Escape special characters for JSONPath strings
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function buildSearchQuery(searchTerm: string): string {
	const escaped = escapeString(searchTerm);
	return `$.items[?search(@.name, "${escaped}")]`;
}
```

### Template-Based Queries

Use a template system for common patterns:

```typescript
const QUERY_TEMPLATES = {
	findById: (id: number) => `$.items[?@.id == ${id}]`,
	findByStatus: (status: string) => {
		const allowed = ['active', 'inactive', 'pending'];
		if (!allowed.includes(status)) {
			throw new Error('Invalid status');
		}
		return `$.items[?@.status == "${status}"]`;
	},
};

// Use templates instead of raw queries
const results = query(data, QUERY_TEMPLATES.findByStatus('active'));
```

---

## Sensitive Data Protection

### Field-Level Access Control

Restrict access to sensitive fields:

```typescript
const RESTRICTED_PATHS = [
	/password/i,
	/secret/i,
	/token/i,
	/apiKey/i,
	/ssn/i,
	/creditCard/i,
];

function isSafePath(queryString: string): boolean {
	return !RESTRICTED_PATHS.some((pattern) => pattern.test(queryString));
}
```

### Redact Results

Remove sensitive data from results:

```typescript
import { omit, query } from '@jsonpath/jsonpath';

function safeQuery(data: any, path: string) {
	const result = query(data, path).values();

	// Redact sensitive fields from all results
	return result.map((item) => {
		if (typeof item === 'object' && item !== null) {
			return omitSensitive(item);
		}
		return item;
	});
}

function omitSensitive(obj: any): any {
	const sensitiveKeys = ['password', 'secret', 'token', 'ssn'];
	const result = { ...obj };
	for (const key of sensitiveKeys) {
		delete result[key];
	}
	return result;
}
```

### Audit Logging

Log query execution for security auditing:

```typescript
interface QueryAudit {
	timestamp: Date;
	userId: string;
	query: string;
	resultCount: number;
	duration: number;
}

async function auditedQuery(
	data: any,
	queryString: string,
	userId: string,
): Promise<any[]> {
	const start = Date.now();
	const result = query(data, queryString).values();

	await logAudit({
		timestamp: new Date(),
		userId,
		query: queryString,
		resultCount: result.length,
		duration: Date.now() - start,
	});

	return result;
}
```

---

## Prototype Pollution Prevention

### Blocked Properties

The library blocks access to dangerous properties:

```typescript
// These are automatically blocked
query(data, "$['__proto__']"); // Throws SecurityError
query(data, "$['constructor']"); // Throws SecurityError
query(data, "$['prototype']"); // Throws SecurityError
```

### Safe Object Creation

When creating objects from query results:

```typescript
// ❌ Dangerous: Spreading untrusted data
const config = { ...defaultConfig, ...queryResult };

// ✅ Safe: Explicit property assignment
const config = {
	...defaultConfig,
	allowedProp: queryResult.allowedProp,
	anotherProp: queryResult.anotherProp,
};

// ✅ Safe: Object.create(null)
const safeObj = Object.create(null);
Object.assign(safeObj, queryResult);
```

---

## Mutation Safety

### Immutable by Default

All mutation operations return new objects:

```typescript
import { set } from '@jsonpath/pointer';

const original = { a: 1 };
const updated = set(original, '/b', 2);

console.log(original); // { a: 1 } - unchanged
console.log(updated); // { a: 1, b: 2 }
```

### Freeze Sensitive Data

Prevent accidental mutation:

```typescript
import { freeze } from '@jsonpath/core';

const sensitiveData = freeze({
	apiKey: 'secret',
	permissions: ['read', 'write'],
});

// Any mutation attempt will throw in strict mode
sensitiveData.apiKey = 'hacked'; // TypeError
```

---

## Security Checklist

### Configuration

- [ ] Set `maxResults` limit
- [ ] Set `maxDepth` limit
- [ ] Set `timeout` limit
- [ ] Set `maxInputSize` limit

### Query Handling

- [ ] Validate all user-provided queries
- [ ] Use allowlist for permitted queries when possible
- [ ] Analyze query complexity before execution
- [ ] Log query execution for auditing

### Data Protection

- [ ] Block access to sensitive field names
- [ ] Redact sensitive data from results
- [ ] Use field-level access control
- [ ] Prevent prototype pollution

### Error Handling

- [ ] Handle limit errors gracefully
- [ ] Don't expose internal errors to users
- [ ] Log security-related errors

---

## Example: Secure Query Endpoint

```typescript
import {
	query,
	configure,
	JSONPathError,
	JSONPathLimitError,
	JSONPathSecurityError,
} from '@jsonpath/jsonpath';

// Configure global limits
configure({
	maxResults: 1000,
	maxDepth: 32,
	timeout: 2000,
});

// Validate queries
function isValidQuery(q: string): boolean {
	if (q.length > 200) return false;
	if (q.includes('..')) return false; // No recursive descent
	try {
		parse(q);
		return true;
	} catch {
		return false;
	}
}

// Secure endpoint handler
export async function handleQuery(req: Request): Promise<Response> {
	const { data, query: queryString } = await req.json();

	// Validate input
	if (!isValidQuery(queryString)) {
		return new Response(JSON.stringify({ error: 'Invalid query' }), {
			status: 400,
		});
	}

	try {
		const result = query(data, queryString, {
			maxResults: 100, // Stricter limit for this endpoint
		});

		return new Response(JSON.stringify({ results: result.values() }), {
			status: 200,
		});
	} catch (err) {
		if (err instanceof JSONPathSecurityError) {
			return new Response(
				JSON.stringify({ error: 'Query blocked by security policy' }),
				{ status: 403 },
			);
		}
		if (err instanceof JSONPathLimitError) {
			return new Response(JSON.stringify({ error: 'Query exceeded limits' }), {
				status: 429,
			});
		}
		if (err instanceof JSONPathError) {
			return new Response(JSON.stringify({ error: 'Query execution failed' }), {
				status: 400,
			});
		}

		console.error('Unexpected error:', err);
		return new Response(JSON.stringify({ error: 'Internal error' }), {
			status: 500,
		});
	}
}
```
