/**
 * @jsonpath/path-builder
 *
 * Fluent API for building JSONPath expressions.
 *
 * @packageDocumentation
 */

import { type JSONPathPlugin } from '@jsonpath/core';

/**
 * Builder for JSONPath filter expressions.
 */
export class FilterBuilder {
	private expr = '';

	/** Reference current node (@) */
	current(): this {
		this.expr += '@';
		return this;
	}

	/** Reference root ($) */
	root(): this {
		this.expr += '$';
		return this;
	}

	/** Add field access */
	field(name: string): this {
		if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
			this.expr += `.${name}`;
		} else {
			this.expr += `['${name.replace(/'/g, "\\'")}']`;
		}
		return this;
	}

	/** Add comparison: equals */
	eq(value: unknown): this {
		this.expr += ` == ${JSON.stringify(value)}`;
		return this;
	}

	/** Add comparison: not equals */
	ne(value: unknown): this {
		this.expr += ` != ${JSON.stringify(value)}`;
		return this;
	}

	/** Add comparison: less than */
	lt(value: number): this {
		this.expr += ` < ${value}`;
		return this;
	}

	/** Add comparison: less than or equal */
	lte(value: number): this {
		this.expr += ` <= ${value}`;
		return this;
	}

	/** Add comparison: greater than */
	gt(value: number): this {
		this.expr += ` > ${value}`;
		return this;
	}

	/** Add comparison: greater than or equal */
	gte(value: number): this {
		this.expr += ` >= ${value}`;
		return this;
	}

	/** Add arithmetic: addition */
	add(a: unknown, b: unknown): this {
		return this.fn('add', a, b);
	}

	/** Add arithmetic: subtraction */
	sub(a: unknown, b: unknown): this {
		return this.fn('sub', a, b);
	}

	/** Add arithmetic: multiplication */
	mul(a: unknown, b: unknown): this {
		return this.fn('mul', a, b);
	}

	/** Add arithmetic: division */
	div(a: unknown, b: unknown): this {
		return this.fn('div', a, b);
	}

	/** Add arithmetic: modulo */
	mod(a: unknown, b: unknown): this {
		return this.fn('mod', a, b);
	}

	/** Add function: length */
	length(arg: unknown): this {
		return this.fn('length', arg);
	}

	/** Add function: count */
	count(arg: unknown): this {
		return this.fn('count', arg);
	}

	/** Add function: match */
	match(val: unknown, regex: string): this {
		return this.fn('match', val, regex);
	}

	/** Add function: search */
	search(val: unknown, regex: string): this {
		return this.fn('search', val, regex);
	}

	/** Add function: value */
	value(arg: unknown): this {
		return this.fn('value', arg);
	}

	/** Add logical AND */
	and(other?: string | ((f: FilterBuilder) => FilterBuilder)): this {
		if (other === undefined) {
			this.expr += ' && ';
		} else if (typeof other === 'string') {
			this.expr += ` && ${other}`;
		} else {
			const builder = new FilterBuilder();
			this.expr += ` && ${other(builder).build()}`;
		}
		return this;
	}

	/** Add logical OR */
	or(other?: string | ((f: FilterBuilder) => FilterBuilder)): this {
		if (other === undefined) {
			this.expr += ' || ';
		} else if (typeof other === 'string') {
			this.expr += ` || ${other}`;
		} else {
			const builder = new FilterBuilder();
			this.expr += ` || ${other(builder).build()}`;
		}
		return this;
	}

	/** Add function call */
	fn(name: string, ...args: unknown[]): this {
		this.expr += `${name}(${args
			.map((a) =>
				typeof a === 'string' && (a.startsWith('@') || a.startsWith('$'))
					? a
					: JSON.stringify(a),
			)
			.join(', ')})`;
		return this;
	}

	/** Wrap in parentheses */
	group(inner: (f: FilterBuilder) => FilterBuilder): this {
		const builder = new FilterBuilder();
		this.expr += `(${inner(builder).build()})`;
		return this;
	}

	/** Build the filter expression */
	build(): string {
		return this.expr;
	}
}

/**
 * Builder for JSONPath expressions.
 */
export class PathBuilder {
	private segments: string[] = [];

	constructor(initial?: string) {
		if (initial) {
			this.segments.push(initial);
		}
	}

	/** Start from root ($) */
	static root(): PathBuilder {
		return new PathBuilder('$');
	}

	/** Start from current node (@) */
	static current(): PathBuilder {
		return new PathBuilder('@');
	}

	/** Add child member selector */
	child(name: string): this {
		if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
			this.segments.push(`.${name}`);
		} else {
			this.segments.push(`['${name.replace(/'/g, "\\'")}']`);
		}
		return this;
	}

	/** Add index selector */
	index(i: number): this {
		this.segments.push(`[${i}]`);
		return this;
	}

	/** Add slice selector */
	slice(start?: number, end?: number, step?: number): this {
		const parts = [
			start !== undefined ? start : '',
			end !== undefined ? end : '',
			step !== undefined ? step : '',
		];
		while (parts.length > 1 && parts[parts.length - 1] === '') {
			parts.pop();
		}
		this.segments.push(`[${parts.join(':')}]`);
		return this;
	}

	/** Add wildcard selector */
	wildcard(): this {
		this.segments.push('.*');
		return this;
	}

	/** Add recursive descent */
	descendant(name?: string): this {
		if (name) {
			this.segments.push(`..${name}`);
		} else {
			this.segments.push('..');
		}
		return this;
	}

	/** Add filter expression */
	filter(expr: string | ((f: FilterBuilder) => FilterBuilder)): this {
		if (typeof expr === 'string') {
			this.segments.push(`[?(${expr})]`);
		} else {
			const builder = new FilterBuilder();
			this.segments.push(`[?(${expr(builder).build()})]`);
		}
		return this;
	}

	/** Add union of selectors */
	union(...selectors: (string | number)[]): this {
		const formatted = selectors
			.map((s) => (typeof s === 'number' ? s : `'${s}'`))
			.join(', ');
		this.segments.push(`[${formatted}]`);
		return this;
	}

	/** Build the JSONPath string */
	build(): string {
		return this.segments.join('');
	}

	/** Get string representation */
	toString(): string {
		return this.build();
	}
}

/**
 * Factory function for PathBuilder.
 */
export function pathBuilder(): PathBuilder {
	return PathBuilder.root();
}

/**
 * Plugin for PathBuilder.
 */
export function pathBuilderPlugin(): JSONPathPlugin {
	return {
		name: 'path-builder',
		onRegister: () => {
			// No-op, just for registration
		},
	};
}

export const jp = PathBuilder;
