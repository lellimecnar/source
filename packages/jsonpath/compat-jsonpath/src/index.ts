import { createEngine } from '@jsonpath/core';
import { setAll } from '@jsonpath/mutate';
import { rfc9535Plugins } from '@jsonpath/plugin-rfc-9535';

const engine = createEngine({ plugins: rfc9535Plugins });

function mapLocationToCompat(loc: any): any[] {
	return [
		'$',
		...loc.components.map((c: any) => (c.kind === 'member' ? c.name : c.index)),
	];
}

export const query = (obj: any, path: string, count?: number) => {
	const results = engine.evaluateSync(engine.compile(path), obj, {
		resultType: 'value',
	});
	return count !== undefined ? results.slice(0, count) : results;
};

export const paths = (obj: any, path: string, count?: number) => {
	const results = engine.evaluateSync(engine.compile(path), obj, {
		resultType: 'node',
	});
	const compatPaths = results.map((n: any) => mapLocationToCompat(n.location));
	return count !== undefined ? compatPaths.slice(0, count) : compatPaths;
};

export const nodes = (obj: any, path: string, count?: number) => {
	const results = engine.evaluateSync(engine.compile(path), obj, {
		resultType: 'node',
	});
	const compatNodes = results.map((n: any) => ({
		path: mapLocationToCompat(n.location),
		value: n.value,
	}));
	return count !== undefined ? compatNodes.slice(0, count) : compatNodes;
};

export const value = (obj: any, path: string, newValue?: any) => {
	if (newValue !== undefined) {
		const pointers = engine.evaluateSync(engine.compile(path), obj, {
			resultType: 'pointer',
		}) as string[];
		if (pointers.length > 0) {
			// Note: setAll returns a new object, but jsonpath package mutates.
			// For true compatibility we might need to mutate, but let's see if this is enough.
			const next = setAll(obj, [pointers[0]], newValue);
			Object.assign(obj, next);
			return newValue;
		}
	}
	const results = engine.evaluateSync(engine.compile(path), obj, {
		resultType: 'value',
	});
	return results[0];
};

export const parent = (obj: any, path: string) => {
	const results = engine.evaluateSync(engine.compile(path), obj, {
		resultType: 'parent',
	});
	return results[0];
};

export const apply = (obj: any, path: string, fn: (v: any) => any) => {
	const nodesList = nodes(obj, path);
	for (const node of nodesList) {
		node.value = fn(node.value);
		value(obj, (node.path as any[]).join('.'), node.value); // This is a bit hacky
	}
	return nodesList;
};

export default {
	query,
	paths,
	nodes,
	value,
	parent,
	apply,
};
