import { GapBuffer, PersistentVector, SmartArray } from '@data-map/arrays';
import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

describe('Baselines / Arrays', () => {
	describe('SmartArray', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/arr');

		bench('arrays.smartArrayPush', () => {
			arr.push(1);
		});

		bench('arrays.smartArraySpliceMiddle', () => {
			arr.splice(0, 0, 1);
			arr.splice(0, 1);
		});
	});

	describe('GapBuffer', () => {
		const gb = new GapBuffer<number>(256);
		for (let i = 0; i < 200; i++) gb.insert(gb.length, i);

		bench('arrays.gapBufferInsertMiddle', () => {
			gb.insert(Math.floor(gb.length / 2), 1);
		});

		bench('arrays.gapBufferDeleteMiddle', () => {
			gb.delete(Math.floor(gb.length / 2));
		});
	});

	describe('PersistentVector', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 1_000; i++) v = v.push(i);

		bench('arrays.persistentVectorPush', () => {
			v = v.push(1);
		});

		bench('arrays.persistentVectorSetMiddle', () => {
			v = v.set(Math.floor(v.length / 2), 123);
		});
	});
});
