import { DataMap } from './data-map.js';

export function createDataMap<T>(initial: T): DataMap<T> {
	return new DataMap(initial);
}
