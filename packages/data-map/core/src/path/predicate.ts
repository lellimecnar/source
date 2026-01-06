import type { PredicateFn } from './segments';

const predicateCache = new Map<
	string,
	{ predicate: PredicateFn; hash: string }
>();

function hashString(s: string): string {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16);
}

/**
 * Normalize a predicate expression by removing extra whitespace.
 * This allows expressions like '@.foo', '@.foo', and '@.foo' to share the same cache entry.
 * Also normalizes operators to always have spaces around them.
 */
function normalizeExpression(expr: string): string {
	let result = expr.trim();
	// Remove all spaces first, then add consistent spacing around operators
	result = result.replace(/\s+/g, '');
	// Add single space around operators for consistent formatting
	result = result.replace(/([=!<>]=?)/g, ' $1 ');
	// Collapse multiple spaces to single space
	result = result.replace(/\s+/g, ' ').trim();
	return result;
}

function exprToJs(expr: string): string {
	// Minimal transform:
	// - @.foo -> value?.foo
	// - @ -> value
	// - match(x, 're') -> new RegExp('re').test(String(x))
	// - == -> ===, != -> !==
	let out = expr;
	out = out.replace(/@\.(\w+)/g, 'value?.$1');
	out = out.replace(/\b@\b/g, 'value');
	out = out.replace(
		/\bmatch\(([^,]+),\s*'([^']*)'\)/g,
		"(new RegExp('$2')).test(String($1))",
	);
	out = out.replace(/==/g, '===');
	out = out.replace(/!=/g, '!==');
	return out;
}

/**
 * Compile a predicate expression with hash-based caching.
 * Normalizes whitespace to maximize cache hit rate.
 * @param expression The predicate expression (e.g., "@.price > 10")
 * @returns Object with compiled predicate function and its normalized hash
 */
export function compilePredicate(expression: string): {
	predicate: PredicateFn;
	hash: string;
} {
	const normalized = normalizeExpression(expression);
	const hash = hashString(normalized);

	const cached = predicateCache.get(hash);
	if (cached) return cached;

	const body = exprToJs(normalized);

	// eslint-disable-next-line no-new-func
	const fn = new Function(
		'value',
		'key',
		'parent',
		`"use strict";\ntry {\n  return Boolean(${body});\n} catch (e) {\n  return false;\n}`,
	) as unknown as PredicateFn;

	const result = { predicate: fn, hash };
	predicateCache.set(hash, result);
	return result;
}
