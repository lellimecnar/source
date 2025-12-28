export interface Match {
	params: Record<string, string>;
}

export function matchPath(pattern: string, pathname: string): Match | null {
	const pSegs = pattern.split('/').filter(Boolean);
	const uSegs = pathname.split('/').filter(Boolean);
	if (pSegs.length !== uSegs.length) return null;

	const params: Record<string, string> = {};
	for (let i = 0; i < pSegs.length; i += 1) {
		const p = pSegs[i]!;
		const u = uSegs[i]!;
		if (p.startsWith(':')) {
			params[p.slice(1)] = decodeURIComponent(u);
			continue;
		}
		if (p !== u) return null;
	}

	return { params };
}
