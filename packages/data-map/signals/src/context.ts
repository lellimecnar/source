import type { DependencySource, Observer } from './internal.js';

const observerStack: Observer[] = [];

export function pushObserver(observer: Observer): void {
	observerStack.push(observer);
}

export function popObserver(): void {
	observerStack.pop();
}

export function currentObserver(): Observer | undefined {
	return observerStack[observerStack.length - 1];
}

export function trackRead(source: DependencySource): void {
	const obs = currentObserver();
	if (!obs) return;
	obs.onDependencyRead(source);
}
