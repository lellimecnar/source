import { PointerResolutionError, PointerSyntaxError } from './errors.js';
import { JSONPointer } from './pointer.js';

export interface ParsedRelativePointer {
	readonly ancestors: number;
	readonly suffix: JSONPointer;
	readonly indexReference: boolean;
}

export function parseRelativePointer(pointer: string): ParsedRelativePointer {
	const match = /^(?<n>0|[1-9][0-9]*)(?<rest>.*)$/.exec(pointer);
	if (!match?.groups) {
		throw new PointerSyntaxError(`Invalid relative JSON Pointer: ${pointer}`, {
			path: pointer,
		});
	}

	const ancestors = Number.parseInt(match.groups.n!, 10);
	let rest = match.groups.rest ?? '';

	let indexReference = false;
	if (rest.endsWith('#')) {
		indexReference = true;
		rest = rest.slice(0, -1);
	}

	if (rest !== '' && !rest.startsWith('/')) {
		throw new PointerSyntaxError(
			`Invalid relative JSON Pointer suffix (must be empty or start with '/'): ${pointer}`,
			{ path: pointer },
		);
	}

	return {
		ancestors,
		suffix: new JSONPointer(rest),
		indexReference,
	};
}

export function isRelativePointer(pointer: string): boolean {
	try {
		parseRelativePointer(pointer);
		return true;
	} catch {
		return false;
	}
}

export class RelativeJSONPointer {
	private readonly parsed: ParsedRelativePointer;

	constructor(pointer: string) {
		this.parsed = parseRelativePointer(pointer);
	}

	toAbsolute(current: JSONPointer): JSONPointer {
		const currentTokens = current.getTokens();
		if (this.parsed.ancestors > currentTokens.length) {
			throw new PointerResolutionError(
				`Relative pointer traversal out of bounds: ${this.parsed.ancestors}`,
			);
		}

		const baseTokens = currentTokens.slice(
			0,
			currentTokens.length - this.parsed.ancestors,
		);

		return new JSONPointer([...baseTokens, ...this.parsed.suffix.getTokens()]);
	}

	resolve(root: unknown, current: JSONPointer): unknown {
		const abs = this.toAbsolute(current);
		if (this.parsed.indexReference) {
			const tokens = abs.getTokens();
			return tokens.length === 0 ? undefined : tokens[tokens.length - 1];
		}
		return abs.resolve(root);
	}

	toString(): string {
		const suffixStr = JSONPointer.format(this.parsed.suffix.getTokens());
		return `${this.parsed.ancestors}${this.parsed.indexReference ? '#' : ''}${suffixStr}`;
	}
}

export function resolveRelative(
	root: unknown,
	current: JSONPointer,
	relative: string,
): unknown {
	return new RelativeJSONPointer(relative).resolve(root, current);
}
