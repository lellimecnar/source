export interface MemorySnapshot {
	rss: number;
	heapTotal: number;
	heapUsed: number;
	external: number;
	arrayBuffers?: number;
}

export function memorySnapshot(): MemorySnapshot | null {
	if (
		typeof process === 'undefined' ||
		typeof process.memoryUsage !== 'function'
	) {
		return null;
	}
	const m = process.memoryUsage();
	return {
		rss: m.rss,
		heapTotal: m.heapTotal,
		heapUsed: m.heapUsed,
		external: m.external,
		arrayBuffers: (m as any).arrayBuffers,
	};
}

export function formatBytes(bytes: number): string {
	const abs = Math.abs(bytes);
	if (abs < 1024) return `${bytes} B`;
	const kb = bytes / 1024;
	if (Math.abs(kb) < 1024) return `${kb.toFixed(2)} KiB`;
	const mb = kb / 1024;
	if (Math.abs(mb) < 1024) return `${mb.toFixed(2)} MiB`;
	const gb = mb / 1024;
	return `${gb.toFixed(2)} GiB`;
}

export function diffMemory(a: MemorySnapshot, b: MemorySnapshot) {
	return {
		rss: b.rss - a.rss,
		heapTotal: b.heapTotal - a.heapTotal,
		heapUsed: b.heapUsed - a.heapUsed,
		external: b.external - a.external,
		arrayBuffers:
			typeof a.arrayBuffers === 'number' && typeof b.arrayBuffers === 'number'
				? b.arrayBuffers - a.arrayBuffers
				: undefined,
	};
}
