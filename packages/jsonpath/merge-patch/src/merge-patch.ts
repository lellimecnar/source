/**
 * JSON Merge Patch (RFC 7386) implementation.
 */
export function applyMergePatch(target: any, patch: any): any {
	if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
		return patch;
	}

	if (target === null || typeof target !== 'object' || Array.isArray(target)) {
		target = {};
	}

	const result = { ...target };

	for (const key of Object.keys(patch)) {
		const value = patch[key];
		if (value === null) {
			delete result[key];
		} else {
			result[key] = applyMergePatch(result[key], value);
		}
	}

	return result;
}
