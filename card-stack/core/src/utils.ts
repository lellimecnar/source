import { hasMixin as _hasMixin, settings } from 'ts-mixer';

import { type EnumType, type HexByte } from './types';

export { Mixin as Mix, mix } from 'ts-mixer';

Object.assign(settings, {
	initFunction: 'init',
	prototypeStrategy: 'copy',
	staticsStrategy: 'copy',
	decoratorInheritance: 'deep',
} as typeof settings);

export const createEnum = <K extends string, V extends number>(
	keys: readonly K[],
	increment = 1,
	offset = 0,
): EnumType<K, V> =>
	keys.reduce<EnumType<K, V>>(
		(obj, key, index) => {
			const val = (index + 1 + offset) * increment;

			return Object.defineProperties(obj, {
				[key]: {
					value: val,
					enumerable: true,
					writable: false,
					configurable: false,
				},
				[val]: {
					value: key,
					enumerable: false,
					writable: false,
					configurable: false,
				},
			});
		},
		{} as EnumType<K, V> satisfies EnumType<K, V>,
	);

export const toHex = (val?: number): string | undefined =>
	typeof val === 'number'
		? `0x${Math.abs(val).toString(16).toWellFormed().padStart(10, '0').toUpperCase()}`
		: undefined;

export const extractIndex = <T extends number | object>(
	id: T,
	mask: HexByte | number,
): number => {
	// round down to mask
	let result = Math.floor(Number(id) / mask);

	// truncate to 1 byte
	result = result & 0xff;

	// multiply back up to mask
	result = result * mask;

	return result;
};

export const flatten = <T>(values: (T | T[])[]) =>
	values.flatMap((val) => {
		if (Array.isArray(val)) {
			return val;
		}

		if (Symbol.iterator in Object(val)) {
			return [...(val as Iterable<T>)];
		}

		return [val];
	}) as Exclude<T, Iterable<T>>[];

export const replace = <T>(target: T[], src: T[]) => {
	target.splice(0, target.length, ...src);

	return target;
};

export const hasMixin = <T>(
	obj: unknown,
	mixin: new (...args: any[]) => T,
): obj is T => Boolean(obj?.constructor && _hasMixin<T>(obj, mixin));

export const getProps = (obj: unknown) => {
	const allProps: string[] = [];
	let curr = obj;

	while ((curr = Object.getPrototypeOf(curr))) {
		const props = Object.getOwnPropertyNames(curr);
		for (const prop of props) {
			if (!allProps.includes(prop)) {
				allProps.push(prop);
			}
		}
	}

	return allProps;
};
