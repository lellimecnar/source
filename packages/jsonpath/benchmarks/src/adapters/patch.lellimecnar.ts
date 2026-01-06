import { applyPatch } from '@jsonpath/patch';

import { type JsonPatchAdapter } from './types.js';

const applyPatchFn = applyPatch as unknown as <T>(
	document: T,
	patch: readonly unknown[],
) => T;

export const lellimecnarPatchAdapter: JsonPatchAdapter = {
	kind: 'patch',
	name: '@jsonpath/patch',
	features: {
		mutatesInput: false,
		returnsDocument: true,
	},
	applyPatch: <T>(document: T, patch: readonly unknown[]): T => {
		return applyPatchFn(document, patch);
	},
	smokeTest: (): boolean => {
		interface Doc {
			a: number;
			b?: number;
		}
		const input: Doc = { a: 1 };
		const patched = applyPatchFn<Doc>(input, [
			{
				op: 'add',
				path: '/b',
				value: 2,
			},
		]);
		return patched.b === 2 && input.b === undefined;
	},
};
