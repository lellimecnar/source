import type { Observer } from './internal.js';

let batchDepth = 0;
const pending = new Set<Observer>();

export function batch<T>(fn: () => T): T {
	batchDepth++;
	try {
		return fn();
	} finally {
		batchDepth--;
		if (batchDepth === 0) {
			flush();
		}
	}
}

export function isBatching(): boolean {
	return batchDepth > 0;
}

export function queueObserver(observer: Observer): void {
	pending.add(observer);
}

function flush(): void {
	if (pending.size === 0) return;
	const toRun = Array.from(pending);
	pending.clear();
	for (const obs of toRun) obs.onDependencyChanged();
}
