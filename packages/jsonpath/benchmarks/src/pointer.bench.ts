import { bench, describe } from 'vitest';
import { JSONPointer } from '@jsonpath/pointer';

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

const pointers = [
	'/store/book/0/title',
	'/store/bicycle/color',
	'/store/book/50/price',
	'/store',
	'',
];

describe('JSON Pointer performance', () => {
	pointers.forEach((pointerStr) => {
		bench(`resolve pointer: ${pointerStr || '(root)'}`, () => {
			const ptr = new JSONPointer(pointerStr);
			ptr.resolve(data);
		});

		bench(`pointer to string: ${pointerStr || '(root)'}`, () => {
			const ptr = new JSONPointer(pointerStr);
			ptr.toString();
		});
	});

	bench('format pointer tokens', () => {
		const tokens = ['store', 'book', '0', 'title'];
		JSONPointer.format(tokens);
	});
});
