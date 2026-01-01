import type { JsonPathPlugin } from '@jsonpath/core';

function isSimpleIdentifier(name: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function escapeSingleQuoted(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r')
		.replace(/\t/g, '\\t')
		.replace(/[\u0000-\u001F]/g, (ch) => {
			const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
			return `\\u${code}`;
		});
}

function normalizedPathFromLocation(location: any): string {
	let out = '$';
	for (const c of location?.components ?? []) {
		if (c.kind === 'index') {
			out += `[${c.index}]`;
			continue;
		}
		const name = String(c.name);
		if (isSimpleIdentifier(name)) out += `.${name}`;
		else out += `['${escapeSingleQuoted(name)}']`;
	}
	return out;
}

export const plugin: JsonPathPlugin = {
	meta: {
		id: '@jsonpath/plugin-result-path',
		capabilities: ['result:path'],
	},
	hooks: {
		registerResults: (registry) => {
			(registry as any).register('path', (nodes: any[]) =>
				nodes.map((n) => normalizedPathFromLocation(n.location)),
			);
		},
	},
};
