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

export function compilePredicate(expression: string): {
	predicate: PredicateFn;
	hash: string;
} {
	const cached = predicateCache.get(expression);
	if (cached) return cached;

	const hash = hashString(expression);
	const body = exprToJs(expression);

	// eslint-disable-next-line no-new-func
	const fn = new Function(
		'value',
		'key',
		'parent',
		`"use strict";\ntry {\n  return Boolean(${body});\n} catch (e) {\n  return false;\n}`,
	) as unknown as PredicateFn;

	const result = { predicate: fn, hash };
	predicateCache.set(expression, result);
	return result;
}
