import { expect, test } from 'vitest';
import { rfc6902PatchAdapter } from './patch.rfc6902';
import { cloneStoreData } from '../test/store-data';

test('rfc6902.applyPatch adapter: add manager', () => {
	const doc = cloneStoreData() as any;
	rfc6902PatchAdapter.applyPatch(doc, [
		{ op: 'add', path: '/store/manager', value: 'John' },
	]);
	expect(doc.store.manager).toBe('John');
});
