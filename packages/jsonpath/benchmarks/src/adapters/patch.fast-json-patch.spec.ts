import { expect, test } from 'vitest';
import { fastJsonPatchAdapter } from './patch.fast-json-patch.js';
import { cloneStoreData } from '../test/store-data.js';

test('fast-json-patch adapter: add manager', () => {
	const patched = fastJsonPatchAdapter.applyPatch(cloneStoreData(), [
		{ op: 'add', path: '/store/manager', value: 'John' },
	]);
	expect((patched as any).store.manager).toBe('John');
});
