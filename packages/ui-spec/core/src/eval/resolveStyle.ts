export function resolveStyle(
	value: unknown,
): Record<string, unknown> | undefined {
	if (value === undefined || value === null) return undefined;
	if (value && typeof value === 'object' && !Array.isArray(value))
		return value as any;
	return undefined;
}
