/**
 * Fluent API for building JSONPath expressions.
 */
export class PathBuilder {
	private parts: string[] = [];

	constructor(initial?: string) {
		if (initial) {
			this.parts.push(initial);
		}
	}

	public static root(): PathBuilder {
		return new PathBuilder('$');
	}

	public static current(): PathBuilder {
		return new PathBuilder('@');
	}

	public child(name: string): this {
		const last = this.parts[this.parts.length - 1];
		const isDescendant = last === '..';

		if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
			if (isDescendant) {
				this.parts.push(name);
			} else {
				this.parts.push(`.${name}`);
			}
		} else {
			this.parts.push(`['${name.replace(/'/g, "\\'")}']`);
		}
		return this;
	}

	public index(i: number): this {
		this.parts.push(`[${i}]`);
		return this;
	}

	public slice(start?: number, end?: number, step?: number): this {
		const s = start ?? '';
		const e = end ?? '';
		const st = step !== undefined ? `:${step}` : '';
		this.parts.push(`[${s}:${e}${st}]`);
		return this;
	}

	public wildcard(): this {
		const last = this.parts[this.parts.length - 1];
		if (last === '..') {
			this.parts.push('*');
		} else {
			this.parts.push('.*');
		}
		return this;
	}

	public descendant(): this {
		this.parts.push('..');
		return this;
	}

	public filter(expression: string): this {
		this.parts.push(`[?(${expression})]`);
		return this;
	}

	public build(): string {
		return this.parts.join('');
	}

	public toString(): string {
		return this.build();
	}
}

export const jp = PathBuilder;
