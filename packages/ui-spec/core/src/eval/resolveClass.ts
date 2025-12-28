export function resolveClass(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) {
		return value
			.flatMap((v) => (typeof v === 'string' ? [v] : []))
			.filter(Boolean)
			.join(' ');
	}
	return undefined;
}
