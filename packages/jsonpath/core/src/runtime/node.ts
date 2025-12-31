import type { Location } from './location';
import { rootLocation } from './location';

export interface JsonPathNode {
	value: unknown;
	location: Location;
}

export function rootNode(value: unknown): JsonPathNode {
	return {
		value,
		location: rootLocation(),
	};
}
