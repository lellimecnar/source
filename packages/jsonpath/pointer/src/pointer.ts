import { PointerSyntaxError } from './errors.js';

/**
 * JSON Pointer (RFC 6901) implementation.
 */
export class JSONPointer {
	private tokens: string[];

	constructor(pointer: string | string[]) {
		if (Array.isArray(pointer)) {
			this.tokens = pointer;
		} else {
			this.tokens = JSONPointer.parse(pointer);
		}
	}

	static fromTokens(tokens: string[]): JSONPointer {
		return new JSONPointer(tokens);
	}

	/**
	 * Parses a JSON Pointer string into tokens.
	 */
	static parse(pointer: string): string[] {
		if (pointer === '') {
			return [];
		}

		if (!pointer.startsWith('/')) {
			throw new PointerSyntaxError(
				'Invalid JSON Pointer: must start with "/" or be empty',
				{ path: pointer },
			);
		}

		const parts = pointer.split('/').slice(1);
		return parts.map((part) => {
			// RFC 6901 §3: '~' MUST be followed by '0' or '1'.
			if (/~[^01]/.test(part) || part.endsWith('~')) {
				throw new PointerSyntaxError(
					`Invalid tilde sequence in JSON Pointer: ${part}`,
					{ path: pointer },
				);
			}
			return part.replace(/~1/g, '/').replace(/~0/g, '~');
		});
	}

	/**
	 * Formats tokens into a JSON Pointer string.
	 */
	static format(tokens: string[]): string {
		if (tokens.length === 0) {
			return '';
		}

		return `/${tokens
			.map((token) => token.toString().replace(/~/g, '~0').replace(/\//g, '~1'))
			.join('/')}`;
	}

	/**
	 * Evaluates the pointer against a JSON object.
	 */
	evaluate(root: any): any {
		let current = root;

		for (const token of this.tokens) {
			if (current === null || typeof current !== 'object') {
				return undefined;
			}

			if (Array.isArray(current)) {
				// RFC 6901 §4: array indices must not have leading zeros
				if (!/^(0|[1-9][0-9]*)$/.test(token)) {
					return undefined;
				}
				const index = Number.parseInt(token, 10);
				if (index < 0 || index >= current.length) {
					return undefined;
				}
				current = current[index];
			} else {
				if (!(token in current)) {
					return undefined;
				}
				current = current[token];
			}
		}

		return current;
	}

	/** DataMap compatibility alias for evaluate(). */
	resolve<T = any>(root: unknown): T | undefined {
		return this.evaluate(root) as T | undefined;
	}

	/**
	 * Resolves the pointer or throws if not found.
	 */
	resolveOrThrow<T = any>(root: unknown): T {
		const result = this.evaluate(root);
		if (result === undefined && !this.exists(root)) {
			throw new Error(`Pointer not found: ${this.toString()}`);
		}
		return result as T;
	}

	/**
	 * DataMap compatibility: distinguish missing vs present undefined.
	 */
	exists(root: unknown): boolean {
		let current: any = root;

		for (const token of this.tokens) {
			if (current === null || typeof current !== 'object') {
				return false;
			}

			if (Array.isArray(current)) {
				if (!/^(0|[1-9][0-9]*)$/.test(token)) {
					return false;
				}
				const index = Number.parseInt(token, 10);
				if (index < 0 || index >= current.length) {
					return false;
				}
				current = current[index];
			} else {
				if (!(token in current)) {
					return false;
				}
				current = current[token];
			}
		}

		return true;
	}

	/**
	 * Sets a value at the pointer's location.
	 * Note: This mutates the root object.
	 */
	set<T>(root: T, value: unknown): T {
		if (this.tokens.length === 0) {
			return value as unknown as T;
		}

		const parentTokens = this.tokens.slice(0, -1);
		const lastToken = this.tokens[this.tokens.length - 1];
		const parent = new JSONPointer(parentTokens).evaluate(root);

		if (parent === undefined) {
			throw new Error(
				`Parent path not found: ${JSONPointer.format(parentTokens)}`,
			);
		}

		if (Array.isArray(parent)) {
			const index = lastToken === '-' ? parent.length : parseInt(lastToken, 10);
			if (Number.isNaN(index) || index < 0 || index > parent.length) {
				throw new Error(`Invalid array index: ${lastToken}`);
			}
			parent[index] = value;
		} else if (typeof parent === 'object' && parent !== null) {
			(parent as any)[lastToken] = value;
		} else {
			throw new Error('Cannot set value on non-object/non-array parent');
		}

		return root;
	}

	/**
	 * Removes the value at the pointer's location.
	 * Note: This mutates the root object.
	 */
	remove<T>(root: T): T {
		if (this.tokens.length === 0) {
			throw new Error('Cannot remove root');
		}

		const parentTokens = this.tokens.slice(0, -1);
		const lastToken = this.tokens[this.tokens.length - 1];
		const parent = new JSONPointer(parentTokens).evaluate(root);

		if (parent === undefined) {
			return root;
		}

		if (Array.isArray(parent)) {
			const index = parseInt(lastToken, 10);
			if (!Number.isNaN(index) && index >= 0 && index < parent.length) {
				parent.splice(index, 1);
			}
		} else if (typeof parent === 'object' && parent !== null) {
			delete (parent as any)[lastToken];
		}

		return root;
	}

	parent(): JSONPointer {
		if (this.tokens.length === 0) return new JSONPointer([]);
		return new JSONPointer(this.tokens.slice(0, -1));
	}

	concat(other: JSONPointer): JSONPointer {
		return new JSONPointer([...this.tokens, ...other.getTokens()]);
	}

	getTokens(): string[] {
		return [...this.tokens];
	}

	toString(): string {
		return JSONPointer.format(this.tokens);
	}

	toJSON(): string {
		return this.toString();
	}
}

/** Helper to evaluate a JSON Pointer string against a root object. */
export function evaluatePointer(root: any, pointer: string): any {
	return new JSONPointer(pointer).evaluate(root);
}
