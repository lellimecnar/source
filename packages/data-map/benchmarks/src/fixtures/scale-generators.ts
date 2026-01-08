/**
 * Scale test data generators for comprehensive performance testing.
 *
 * Produces normalized test cases at different scales to evaluate system behavior
 * under varying data sizes, from minimal to large-scale scenarios.
 */

export interface ScaleDataset {
	/**
	 * The size identifier (e.g., "1k", "10k", "100k").
	 */
	label: string;
	/**
	 * The number of items in this scale.
	 */
	count: number;
	/**
	 * Generated test data (typically an object or array).
	 */
	data: unknown;
}

/**
 * Generate a flat object with `count` properties.
 * Used for testing key-value operations at scale.
 */
export function generateFlatObject(count: number): Record<string, unknown> {
	const obj: Record<string, unknown> = {};
	for (let i = 0; i < count; i++) {
		obj[`key_${i}`] = i;
	}
	return obj;
}

/**
 * Generate an array of `count` items.
 * Used for testing array operations at scale.
 */
export function generateArray(count: number): unknown[] {
	return Array.from({ length: count }, (_, i) => ({
		id: i,
		value: Math.random(),
		name: `item_${i}`,
	}));
}

/**
 * Generate a deeply nested object structure.
 * Used for testing path traversal and access at scale.
 */
export function generateNestedObject(depth: number, width: number): unknown {
	function buildLevel(d: number): unknown {
		if (d === 0) return Math.random();
		const obj: Record<string, unknown> = {};
		for (let i = 0; i < width; i++) {
			obj[`prop_${i}`] = buildLevel(d - 1);
		}
		return obj;
	}
	return buildLevel(depth);
}

/**
 * Generate a collection of JSON Pointer paths.
 * Used for benchmarking path-based access operations.
 */
export function generatePointerPaths(count: number): string[] {
	const paths: string[] = [];
	for (let i = 0; i < count; i++) {
		const depth = Math.floor(Math.random() * 3) + 1;
		const parts: string[] = [];
		for (let j = 0; j < depth; j++) {
			parts.push(`part_${Math.floor(Math.random() * 100)}`);
		}
		paths.push(`/${parts.join('/')}`);
	}
	return paths;
}

/**
 * Common scale dataset sizes for consistent benchmarking.
 */
export const SCALE_SIZES = {
	small: 100,
	medium: 1_000,
	large: 10_000,
	xlarge: 100_000,
} as const;

/**
 * Generate standard scale datasets for benchmarking.
 */
export function generateScaleDatasets(
	type: 'flat' | 'array' | 'nested' | 'paths',
): ScaleDataset[] {
	const datasets: ScaleDataset[] = [];

	for (const [label, count] of Object.entries(SCALE_SIZES)) {
		let data: unknown;
		switch (type) {
			case 'flat':
				data = generateFlatObject(count);
				break;
			case 'array':
				data = generateArray(count);
				break;
			case 'nested':
				data = generateNestedObject(3, 2);
				break;
			case 'paths':
				data = generatePointerPaths(count);
				break;
		}

		datasets.push({
			label,
			count,
			data,
		});
	}

	return datasets;
}
