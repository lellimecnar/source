import type { PatchOperation } from '@jsonpath/patch';
import { applyPatch } from '@jsonpath/patch';

export const jsonpatch = {
	apply(patch: PatchOperation[], target: any) {
		return applyPatch(target, patch, { mutate: true });
	},
};
