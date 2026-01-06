import { expect, test } from 'vitest';
import { lellimecnarPatchAdapter } from './patch.lellimecnar';
import { cloneStoreData } from '../test/store-data';

test('@jsonpath/patch adapter: add manager', () => {
	const patched = lellimecnarPatchAdapter.applyPatch(cloneStoreData(), [
		{ op: 'add', path: '/store/manager', value: 'John' },
	]);
	expect((patched as any).store.manager).toBe('John');
});
