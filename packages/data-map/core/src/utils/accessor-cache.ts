const accessorCache = new Map<string, (obj: any) => any>();

export function compileAccessor(path: string): (obj: any) => any {
	const cached = accessorCache.get(path);
	if (cached) return cached;

	// JSON Pointer tokens: split on '/', drop the leading empty token.
	// IMPORTANT: do not filter empty segments ("//" is a valid pointer token).
	const segments = path.split('/').slice(1);
	const accessor = (obj: any) => {
		let current = obj;
		for (const seg of segments) {
			if (current == null) return undefined;
			current = current[seg];
		}
		return current;
	};

	accessorCache.set(path, accessor);
	return accessor;
}
