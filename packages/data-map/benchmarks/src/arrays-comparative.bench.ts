import { GapBuffer, PersistentVector, SmartArray } from '@data-map/arrays';
import { FlatStore } from '@data-map/storage';
import { bench, describe } from 'vitest';

describe('Arrays / Comparative', () => {
	bench('arrays.nativePush', () => {
		const a: number[] = [];
		for (let i = 0; i < 10_000; i++) a.push(i);
	});

	bench('arrays.smartArrayPush', () => {
		const store = new FlatStore();
		const arr = new SmartArray(store, '/arr');
		for (let i = 0; i < 10_000; i++) arr.push(i);
	});

	bench('arrays.gapBufferInsertMiddle', () => {
		const gb = new GapBuffer<number>(256);
		for (let i = 0; i < 100; i++) gb.insert(Math.floor(i / 2), i);
	});

	bench('arrays.persistentVectorPush', () => {
		let v = new PersistentVector<number>();
		for (let i = 0; i < 1_000; i++) v = v.push(i);
	});
});
