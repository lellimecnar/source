/**
 * @jsonpath/merge-patch
 *
 * RFC 7386 validation helpers.
 *
 * @packageDocumentation
 */

/**
 * Checks if a value is a valid JSON Merge Patch.
 * RFC 7386: A JSON Merge Patch is any JSON value.
 * However, in practice, we often want to ensure it's a value that can be
 * serialized to JSON.
 *
 * @param patch - The value to check.
 * @returns True if the value is a valid JSON Merge Patch.
 */
export function isValidMergePatch(patch: unknown): boolean {
	// RFC 7386: "A JSON Merge Patch is a JSON document that represents the
	// changes to be made to a target JSON document."
	// Any valid JSON value is a valid merge patch.
	try {
		// Basic check for JSON-serializable values
		if (
			patch === undefined ||
			typeof patch === 'function' ||
			typeof patch === 'symbol'
		) {
			return false;
		}

		// Check for circular references or other non-serializable structures
		JSON.stringify(patch);
		return true;
	} catch {
		return false;
	}
}
