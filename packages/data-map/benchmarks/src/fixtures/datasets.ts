import type { DatasetCatalog } from './types.js';
import {
	generateDeepObject,
	generateMixedData,
	generateWideArray,
	generateWideObject,
} from './generators.js';

export const DATASETS: DatasetCatalog = {
	smallObject: generateWideObject({ width: 10, depth: 2, seed: 1 }),
	mediumObject: generateWideObject({ width: 20, depth: 3, seed: 2 }),
	largeObject: generateWideObject({ width: 50, depth: 4, seed: 3 }),
	deepObject: generateDeepObject({ depth: 10, seed: 4 }),
	wideArray: generateWideArray({ length: 100, seed: 5 }),
	mixed: generateMixedData({ seed: 7 }),
};
