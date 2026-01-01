import type { Location } from './location';
import { rootLocation } from './location';

export interface JsonPathNode {
	value: unknown;
	location: Location;
	root: unknown;
}

export function rootNode(value: unknown): JsonPathNode {
	return {
		value,
		location: rootLocation(),
		root: value,
	};
}
