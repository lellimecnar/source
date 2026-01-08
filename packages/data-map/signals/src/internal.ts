export interface DependencySource {
	addObserver(observer: Observer): void;
	removeObserver(observer: Observer): void;
}

export interface Observer {
	onDependencyRead(source: DependencySource): void;
	onDependencyChanged(): void;
}
