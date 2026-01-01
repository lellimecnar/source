import type { JsonPathAst } from '@jsonpath/ast';
import { FilterExprKinds, SelectorKinds } from '@jsonpath/ast';

import type { PrintOptions } from './options';

export function printAst(ast: JsonPathAst, _options?: PrintOptions): string {
	if (ast.kind !== 'Path') return '$';
	let out = '$';
	for (const seg of ast.segments) {
		const selectors = (seg as any).selectors as unknown[];
		const isDescendant = seg.kind === 'DescendantSegment';
		out += isDescendant ? '..' : '';

		// Canonical printing strategy:
		// - Prefer dot-notation only for simple Name selectors.
		// - Otherwise use bracket selector lists.
		if (
			!isDescendant &&
			selectors.length === 1 &&
			(selectors[0] as any).kind === SelectorKinds.Name &&
			isSimpleIdentifier((selectors[0] as any).name)
		) {
			out += `.${(selectors[0] as any).name}`;
			continue;
		}

		if (
			isDescendant &&
			selectors.length === 1 &&
			(selectors[0] as any).kind === SelectorKinds.Name &&
			isSimpleIdentifier((selectors[0] as any).name)
		) {
			out += (selectors[0] as any).name;
			continue;
		}

		if (
			isDescendant &&
			selectors.length === 1 &&
			(selectors[0] as any).kind === SelectorKinds.Wildcard
		) {
			out += '*';
			continue;
		}

		out += `[${selectors.map((s) => printSelector(s as any)).join(',')}]`;
	}
	return out;
}

function isSimpleIdentifier(name: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function printSelector(sel: any): string {
	if (sel.kind === SelectorKinds.Name) return quoteString(sel.name);
	if (sel.kind === SelectorKinds.Index) return String(sel.index);
	if (sel.kind === SelectorKinds.Wildcard) return '*';
	if (sel.kind === SelectorKinds.Slice) {
		const start = sel.start != null ? String(sel.start) : '';
		const end = sel.end != null ? String(sel.end) : '';
		const step = sel.step != null ? String(sel.step) : '';
		return `${start}:${end}${sel.step != null ? `:${step}` : ''}`;
	}
	if (sel.kind === SelectorKinds.Filter) {
		return `?(${printFilterExpr(sel.expr)})`;
	}
	return '*';
}

function printFilterExpr(expr: any): string {
	if (expr.kind === FilterExprKinds.Literal) {
		if (expr.value === null) return 'null';
		if (typeof expr.value === 'string') return quoteString(expr.value);
		return String(expr.value);
	}
	if (expr.kind === FilterExprKinds.Not)
		return `!(${printFilterExpr(expr.expr)})`;
	if (expr.kind === FilterExprKinds.And)
		return `(${printFilterExpr(expr.left)})&&(${printFilterExpr(expr.right)})`;
	if (expr.kind === FilterExprKinds.Or)
		return `(${printFilterExpr(expr.left)})||(${printFilterExpr(expr.right)})`;
	if (expr.kind === FilterExprKinds.Compare)
		return `(${printFilterExpr(expr.left)})${expr.operator}(${printFilterExpr(expr.right)})`;
	if (expr.kind === FilterExprKinds.FunctionCall)
		return `${expr.name}(${(expr.args ?? []).map((a: any) => printFilterExpr(a)).join(',')})`;
	if (expr.kind === FilterExprKinds.EmbeddedQuery) {
		const head = expr.scope === 'root' ? '$' : '@';
		const fakePath = { kind: 'Path', segments: expr.segments ?? [] } as any;
		return head + printAst(fakePath).slice(1);
	}
	return 'null';
}

function quoteString(value: string): string {
	// RFC 9535 member-name selectors use single-quoted strings.
	return `'${escapeSingleQuoted(value)}'`;
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
