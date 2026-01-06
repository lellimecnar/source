import { applyPatch } from 'rfc6902';

import { type JsonPatchAdapter } from './types.js';

const rfcApplyPatch = applyPatch as unknown as (
	object: unknown,
	patch: readonly unknown[],
) => (Error | null)[];

export const rfc6902PatchAdapter: JsonPatchAdapter = {
	kind: 'patch',
	name: 'rfc6902.applyPatch',
	features: {
		mutatesInput: true,
		returnsDocument: true,
	},
	applyPatch: <T>(document: T, patch: readonly unknown[]): T => {
		rfcApplyPatch(document, patch);
		return document;
	},
	smokeTest: (): boolean => {
		interface Doc {
			a: number;
			b?: number;
		}
		const input: Doc = { a: 1 };
		rfcApplyPatch(input, [{ op: 'add', path: '/b', value: 2 }]);
		return input.b === 2;
	},
};
