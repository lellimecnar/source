import { createEngine } from '@jsonpath/core';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

const engine = createEngine({ plugins: rfc9535Plugins });

export type JSONPathEvalMode = 'safe' | 'native' | false;

export interface JSONPathOptions {
	path: string;
	json: any;
	resultType?:
		| 'value'
		| 'path'
		| 'pointer'
		| 'parent'
		| 'parentProperty'
		| 'all';
	wrap?: boolean;
	eval?: JSONPathEvalMode;
}

function mapLocationToPlusPath(loc: any): string {
	let out = '$';
	for (const c of loc.components) {
		if (c.kind === 'index') {
			out += `[${c.index}]`;
		} else {
			out += `['${c.name.replace(/'/g, "\\'")}']`;
		}
	}
	return out;
}

function mapLocationToPlusPointer(loc: any): string {
	return `/${loc.components
		.map((c: any) =>
			String(c.kind === 'member' ? c.name : c.index)
				.replace(/~/g, '~0')
				.replace(/\//g, '~1'),
		)
		.join('/')}`;
}

function getByPointer(obj: any, pointer: string): any {
	if (pointer === '/') return obj;
	const parts = pointer.split('/').slice(1);
	let curr = obj;
	for (const part of parts) {
		const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
		if (curr === null || typeof curr !== 'object') return undefined;
		curr = curr[key];
	}
	return curr;
}

export function JSONPath<T = any>(options: JSONPathOptions): T {
	const { path, json, resultType = 'value', wrap = true } = options;

	const nodes = engine.evaluateSync(engine.compile(path), json, {
		resultType: 'node',
	}) as any[];

	let results: any[];

	if (resultType === 'value') {
		results = nodes.map((n) => n.value);
	} else if (resultType === 'path') {
		results = nodes.map((n) => mapLocationToPlusPath(n.location));
	} else if (resultType === 'pointer') {
		results = nodes.map((n) => mapLocationToPlusPointer(n.location));
	} else if (resultType === 'parent') {
		results = nodes.map((n) => {
			const pointer = mapLocationToPlusPointer(n.location);
			const parentPointer =
				pointer.substring(0, pointer.lastIndexOf('/')) || '/';
			return getByPointer(n.root, parentPointer);
		});
	} else if (resultType === 'parentProperty') {
		results = nodes.map((n) => {
			const last = n.location.components[n.location.components.length - 1];
			return last?.kind === 'member' ? last.name : last?.index;
		});
	} else if (resultType === 'all') {
		results = nodes.map((n) => {
			const pointer = mapLocationToPlusPointer(n.location);
			const parentPointer =
				pointer.substring(0, pointer.lastIndexOf('/')) || '/';
			const last = n.location.components[n.location.components.length - 1];
			return {
				value: n.value,
				path: mapLocationToPlusPath(n.location),
				pointer,
				parent: getByPointer(n.root, parentPointer),
				parentProperty: last?.kind === 'member' ? last.name : last?.index,
			};
		});
	} else {
		results = [];
	}

	if (!wrap && results.length === 1) return results[0];
	return results as any;
}

export function readJsonPath(
	json: unknown,
	pathExpr: string,
	evalMode: JSONPathEvalMode = 'safe',
): unknown {
	return JSONPath({
		path: pathExpr,
		json,
		wrap: false,
		eval: evalMode,
	});
}

export function findJsonPathPointers(
	json: unknown,
	pathExpr: string,
	evalMode: JSONPathEvalMode = 'safe',
): string[] {
	return JSONPath({
		path: pathExpr,
		json,
		resultType: 'pointer',
		wrap: true,
		eval: evalMode,
	});
}
