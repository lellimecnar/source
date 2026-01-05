import { bench, describe } from 'vitest';
import { applyPatch } from '@jsonpath/patch';
import type { PatchOperation } from '@jsonpath/patch';

const data = {
	store: {
		book: Array.from({ length: 100 }, (_, i) => ({
			title: `Book ${i}`,
			price: Math.random() * 100,
			category: i % 2 === 0 ? 'fiction' : 'reference',
		})),
		bicycle: { color: 'red', price: 19.95 },
	},
};

describe('JSON Patch performance', () => {
	bench('apply single add operation', () => {
		const patch: PatchOperation[] = [
			{ op: 'add', path: '/store/manager', value: 'John' },
		];
		const result = applyPatch({ ...data }, patch);
		result;
	});

	bench('apply multiple operations', () => {
		const patch: PatchOperation[] = [
			{ op: 'add', path: '/store/manager', value: 'John' },
			{
				op: 'copy',
				from: '/store/bicycle/color',
				path: '/store/bicycle/color_backup',
			},
			{ op: 'replace', path: '/store/bicycle/price', value: 29.99 },
		];
		const result = applyPatch({ ...data }, patch);
		result;
	});

	bench('apply patch with array modifications', () => {
		const patch: PatchOperation[] = [
			{
				op: 'add',
				path: '/store/book/-',
				value: { title: 'New Book', price: 15.99 },
			},
			{ op: 'remove', path: '/store/book/0' },
		];
		const result = applyPatch({ ...data }, patch);
		result;
	});

	bench('apply empty patch', () => {
		const patch: PatchOperation[] = [];
		const result = applyPatch({ ...data }, patch);
		result;
	});
});
