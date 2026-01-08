import { popObserver, pushObserver } from './context.js';
import type { CleanupFn, EffectHandle } from './types.js';
import type { DependencySource, Observer } from './internal.js';

class EffectImpl implements EffectHandle, Observer {
	private fn: () => void | CleanupFn;
	private sources = new Set<DependencySource>();
	private cleanup: CleanupFn | undefined;
	private disposed = false;

	constructor(fn: () => void | CleanupFn) {
		this.fn = fn;
		this.run();
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		for (const src of this.sources) src.removeObserver(this);
		this.sources.clear();
		this.cleanup?.();
		this.cleanup = undefined;
	}

	onDependencyRead(source: DependencySource): void {
		if (this.sources.has(source)) return;
		this.sources.add(source);
		source.addObserver(this);
	}

	onDependencyChanged(): void {
		if (this.disposed) return;
		this.run();
	}

	private run(): void {
		this.cleanup?.();
		this.cleanup = undefined;
		for (const src of this.sources) src.removeObserver(this);
		this.sources.clear();
		pushObserver(this);
		try {
			const res = this.fn();
			if (typeof res === 'function') this.cleanup = res;
		} finally {
			popObserver();
		}
	}
}

export function effect(fn: () => void | CleanupFn): EffectHandle {
	return new EffectImpl(fn);
}
