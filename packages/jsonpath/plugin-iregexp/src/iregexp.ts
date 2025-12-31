export function matches(pattern: string, value: string): boolean {
	try {
		return new RegExp(pattern).test(value);
	} catch {
		return false;
	}
}
