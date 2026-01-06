import {
	generateDeepObject,
	generateLargeArray,
	generateMixedData,
	generateWideObject,
} from './data-generators.js';

export const STORE_DATA = generateMixedData();

export const LARGE_ARRAY_100 = generateLargeArray(100);
export const LARGE_ARRAY_1K = generateLargeArray(1_000);
export const LARGE_ARRAY_10K = generateLargeArray(10_000);
export const LARGE_ARRAY_100K = generateLargeArray(100_000);

export const DEEP_OBJECT_5 = generateDeepObject(5);
export const DEEP_OBJECT_10 = generateDeepObject(10);
export const DEEP_OBJECT_20 = generateDeepObject(20);

export const WIDE_OBJECT_10 = generateWideObject(10);
export const WIDE_OBJECT_100 = generateWideObject(100);
export const WIDE_OBJECT_1000 = generateWideObject(1000);
