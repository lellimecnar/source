import { JSONPathSecurityError, Nothing } from '@jsonpath/core';

export const FORBIDDEN_PROPERTIES = new Set<string>([
	'constructor',
	'__proto__',
	'prototype',
	'__defineGetter__',
	'__defineSetter__',
	'__lookupGetter__',
	'__lookupSetter__',
	'eval',
	'Function',
	'toString',
	'valueOf',
]);

export function safePropertyAccess(obj: unknown, prop: string): unknown {
	if (typeof prop !== 'string') return Nothing;
	if (FORBIDDEN_PROPERTIES.has(prop)) {
		throw new JSONPathSecurityError(`Access to '${prop}' is forbidden`);
	}
	if (obj === null || obj === undefined) return Nothing;
	if (typeof obj !== 'object') return Nothing;
	if (!Object.hasOwn(obj as object, prop)) return Nothing;
	return (obj as Record<string, unknown>)[prop];
}
