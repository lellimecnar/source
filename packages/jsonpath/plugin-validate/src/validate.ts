import type { JsonPathEngine } from '@jsonpath/core';
import { formatPointer } from '@jsonpath/pointer';

import type {
	Issue,
	ValidatorAdapter,
	ValidationResult,
	ValidationItem,
} from './types';

export function validateAll(
	values: readonly unknown[],
	adapter: ValidatorAdapter,
): Issue[] {
	const issues: Issue[] = [];
	for (const v of values) issues.push(...adapter.validate(v));
	return issues;
}

function isSimpleIdentifier(name: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function escapeSingleQuoted(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
		.replace(/[\u0000-\u001F]/g, (ch) => {
			const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
			return `\\u${code}`;
		});
}

function pointerFromLocation(location: any): string {
	const parts = (location?.components ?? []).map((c: any) =>
		c.kind === 'index' ? String(c.index) : String(c.name),
	);
	return formatPointer(parts);
}

function pathFromLocation(location: any): string {
	let out = '$';
	for (const c of location?.components ?? []) {
		if (c.kind === 'index') {
			out += `[${c.index}]`;
			continue;
		}
		const name = String(c.name);
		if (isSimpleIdentifier(name)) out += `.${name}`;
		else out += `['${escapeSingleQuoted(name)}']`;
	}
	return out;
}

export function validateQuerySync(
	engine: JsonPathEngine,
	json: unknown,
	query: string,
	adapter: ValidatorAdapter,
): ValidationResult {
	const compiled = engine.compile(query);
	const nodes = engine.evaluateSync(compiled, json, {
		resultType: 'node',
	}) as any[];

	const items: ValidationItem[] = nodes.map((n) => {
		const issues = adapter.validate(n.value) as Issue[];
		return {
			value: n.value,
			pointer: pointerFromLocation(n.location),
			path: pathFromLocation(n.location),
			issues: [...issues],
		};
	});

	return { ok: items.every((i) => i.issues.length === 0), items };
}
