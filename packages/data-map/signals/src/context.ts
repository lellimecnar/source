import type { DependencySource, Observer } from './internal.js';

const observerStack: Observer[] = [];

const NOOP_OBSERVER: Observer = {
	onDependencyRead(): void {
		// intentionally empty (disables tracking)
	},
	onDependencyChanged(): void {
		// intentionally empty
	},
};

export function pushObserver(observer: Observer): void {
	observerStack.push(observer);
}

export function popObserver(): void {
	observerStack.pop();
}

export function currentObserver(): Observer | undefined {
	return observerStack[observerStack.length - 1];
}

export function getCurrentEffect(): Observer | null {
	return currentObserver() ?? null;
}

export function trackRead(source: DependencySource): void {
	const obs = currentObserver();
	if (!obs) return;
	obs.onDependencyRead(source);
}

export function untracked<T>(fn: () => T): T {
	pushObserver(NOOP_OBSERVER);
	try {
		return fn();
	} finally {
		popObserver();
	}
}

export function track(source: DependencySource): void {
	trackRead(source);
}

export function trigger(source: DependencySource): void {
	source.triggerObservers?.();
}
