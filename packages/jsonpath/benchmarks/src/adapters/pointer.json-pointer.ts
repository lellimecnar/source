import pointer from 'json-pointer';

import { type JsonPointerAdapter } from './types.js';

interface JsonPointerModule {
	get: (object: unknown, pointer: string | readonly string[]) => unknown;
	set: (
		object: unknown,
		pointer: string | readonly string[],
		value: unknown,
	) => void;
	remove: (object: unknown, pointer: string | readonly string[]) => void;
	has: (object: unknown, pointer: string | readonly string[]) => boolean;
	parse: (pointer: string) => string[];
	compile: (tokens: readonly string[]) => string;
}

const jsonPointer = pointer as unknown as JsonPointerModule;

export const jsonPointerAdapter: JsonPointerAdapter = {
	kind: 'pointer',
	name: 'json-pointer',
	features: {
		supportsGet: true,
		supportsSet: true,
		supportsRemove: true,
		supportsHas: true,
		supportsParse: true,
		supportsCompile: true,
		mutatesInput: true,
	},
	get: <T = unknown>(obj: unknown, ptr: string | readonly string[]): T => {
		return jsonPointer.get(obj, ptr) as T;
	},
	set: (
		obj: unknown,
		ptr: string | readonly string[],
		value: unknown,
	): unknown => {
		jsonPointer.set(obj, ptr, value);
		return obj;
	},
	remove: (obj: unknown, ptr: string | readonly string[]): unknown => {
		jsonPointer.remove(obj, ptr);
		return obj;
	},
	has: (obj: unknown, ptr: string | readonly string[]): boolean => {
		return jsonPointer.has(obj, ptr);
	},
	parse: (ptr: string): string[] => {
		return jsonPointer.parse(ptr);
	},
	compile: (tokens: readonly string[]): string => {
		return jsonPointer.compile(tokens);
	},
	smokeTest: (): boolean => {
		const data: { a: { b?: number; c?: number } } = { a: { b: 1 } };
		const v1 = jsonPointer.get(data, '/a/b') as number;
		jsonPointer.set(data, '/a/c', 2);
		const v2 = jsonPointer.get(data, '/a/c') as number;
		jsonPointer.remove(data, '/a/b');
		return v1 === 1 && v2 === 2 && data.a.b === undefined;
	},
};
