export interface MaterializeWorkerPool {
	materialize<T>(fn: () => T): Promise<T>;
}

export class SyncMaterializePool implements MaterializeWorkerPool {
	async materialize<T>(fn: () => T): Promise<T> {
		return fn();
	}
}
