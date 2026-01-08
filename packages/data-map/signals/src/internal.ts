export interface DependencySource {
	addObserver: (observer: Observer) => void;
	removeObserver: (observer: Observer) => void;

	/**
	 * Optional hook for external integrations to trigger downstream observers
	 * without requiring a value write (used by exported `trigger()`).
	 */
	triggerObservers?: () => void;
}

export interface Observer {
	onDependencyRead: (source: DependencySource) => void;
	onDependencyChanged: () => void;
}
