import { expect, test } from 'vitest';
import { fastJsonPatchAdapter } from './patch.fast-json-patch';
import { cloneStoreData } from '../test/store-data';

test('fast-json-patch adapter: add manager', () => {
	const patched = fastJsonPatchAdapter.applyPatch(cloneStoreData(), [
		{ op: 'add', path: '/store/manager', value: 'John' },
	]);
	expect((patched as any).store.manager).toBe('John');
});
