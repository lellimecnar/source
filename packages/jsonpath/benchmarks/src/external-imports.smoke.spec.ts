import { describe, expect, it } from 'vitest';

// JSONPath
import { jsonpath } from 'json-p3';
// @ts-expect-error jsonpath has no bundled types
import jsonpathLegacy from 'jsonpath';
import { JSONPath as jsonpathPlus } from 'jsonpath-plus';

// JSON Patch
import * as fastJsonPatch from 'fast-json-patch';
import { applyPatch as applyPatchRfc6902 } from 'rfc6902';

// JSON Pointer
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import jsonPointer from 'json-pointer';

// JSON Merge Patch
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
import jsonMergePatch from 'json-merge-patch';

describe('external imports smoke', () => {
	it('imports load expected entrypoints', () => {
		expect(typeof jsonpath.query).toBe('function');
		expect(typeof jsonpathLegacy.query).toBe('function');
		expect(typeof jsonpathPlus).toBe('function');

		expect(typeof fastJsonPatch.applyPatch).toBe('function');
		expect(typeof applyPatchRfc6902).toBe('function');

		expect(typeof jsonPointer.get).toBe('function');
		expect(typeof jsonPointer.set).toBe('function');

		expect(typeof jsonMergePatch.apply).toBe('function');
		expect(typeof jsonMergePatch.generate).toBe('function');
	});
});
