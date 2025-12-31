export interface CompiledIRegexp {
	pattern: string;
	full: RegExp;
	partial: RegExp;
}

export function compile(pattern: string): CompiledIRegexp | null {
	try {
		// NOTE: This is a pragmatic placeholder. Full RFC 9485 validation belongs here.
		return {
			pattern,
			full: new RegExp(`^(?:${pattern})$`),
			partial: new RegExp(pattern),
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
