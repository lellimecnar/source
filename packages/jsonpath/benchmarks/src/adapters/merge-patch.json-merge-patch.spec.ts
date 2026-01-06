import { expect, test } from 'vitest';
import { jsonMergePatchAdapter } from './merge-patch.json-merge-patch.js';
import { cloneStoreData } from '../test/store-data.js';

test('json-merge-patch adapter: generate+apply', () => {
	const source = cloneStoreData() as any;
	const target = cloneStoreData() as any;
	target.store.bicycle.color = 'blue';
	const patch = jsonMergePatchAdapter.generate(source, target);
	expect(
		(jsonMergePatchAdapter.apply(cloneStoreData() as any, patch) as any).store
			.bicycle.color,
	).toBe('blue');
});
