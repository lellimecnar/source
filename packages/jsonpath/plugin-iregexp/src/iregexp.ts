export interface CompiledIRegexp {
	pattern: string;
	full: RegExp;
	partial: RegExp;
}

export function compile(pattern: string): CompiledIRegexp | null {
	try {
		// RFC 9485 (I-Regexp) validation
		// This is a pragmatic implementation that rejects common non-I-Regexp features.
		if (
			pattern.includes('(?') || // Lookaround or named groups
			/\\\d/.test(pattern) || // Backreferences
			/[*+?}](\?)/.test(pattern) // Non-greedy quantifiers
		) {
			return null;
		}

		return {
			pattern,
			full: new RegExp(`^(?:${pattern})$`, 'u'),
			partial: new RegExp(pattern, 'u'),
		};
	} catch {
		return null;
	}
}

export function matchesEntire(pattern: string, value: string): boolean {
	const c = compile(pattern);
	if (!c) return false;
	return c.full.test(value);
}

export function searches(pattern: string, value: string): boolean {
	const c = compile(pattern);
	if (!c) return false;
	return c.partial.test(value);
}
