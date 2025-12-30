/* eslint-disable */
// Generated from plans/jsonpath/implementation.md (Step 3)

const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dir) {
	fs.mkdirSync(dir, { recursive: true });
}

function write(filePath, content) {
	ensureDir(path.dirname(filePath));
	fs.writeFileSync(filePath, content, 'utf8');
}

const pkgDir = path.join(process.cwd(), 'packages', 'jsonpath', 'core');

write(
	path.join(pkgDir, 'src', 'plugins', 'types.ts'),
	`export type JsonPathPluginId = string;\n\nexport type JsonPathCapability = string;\n\nexport type JsonPathPluginMeta = {\n\tid: JsonPathPluginId;\n\tcapabilities?: readonly JsonPathCapability[];\n\tdependsOn?: readonly JsonPathPluginId[];\n\toptionalDependsOn?: readonly JsonPathPluginId[];\n\tpeerDependencies?: readonly string[];\n};\n\nexport type JsonPathPlugin<Config = unknown> = {\n\tmeta: JsonPathPluginMeta;\n\tconfigure?: (config: Config | undefined) => void;\n};\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'order.ts'),
	`import type { JsonPathPlugin } from './types';\n\nexport function orderPluginsDeterministically(plugins: readonly JsonPathPlugin[]): JsonPathPlugin[] {\n\t// Preserve explicit input order only when duplicates are not present;\n\t// otherwise, keep stable by plugin id.\n\tconst seen = new Set<string>();\n\tconst deduped: JsonPathPlugin[] = [];\n\tfor (const p of plugins) {\n\t\tif (seen.has(p.meta.id)) continue;\n\t\tseen.add(p.meta.id);\n\t\tdeduped.push(p);\n\t}\n\n\treturn [...deduped].sort((a, b) => a.meta.id.localeCompare(b.meta.id));\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'resolve.ts'),
	`import { JsonPathError } from '../errors/JsonPathError';\nimport { JsonPathErrorCodes } from '../errors/codes';\nimport type { JsonPathCapability, JsonPathPlugin, JsonPathPluginId } from './types';\nimport { orderPluginsDeterministically } from './order';\n\nexport type ResolvePluginsResult = {\n\tordered: readonly JsonPathPlugin[];\n\tbyId: ReadonlyMap<JsonPathPluginId, JsonPathPlugin>;\n};\n\nfunction list(p?: readonly string[]): readonly string[] {\n\treturn p ?? [];\n}\n\nexport function resolvePlugins(plugins: readonly JsonPathPlugin[]): ResolvePluginsResult {\n\tconst ordered = orderPluginsDeterministically(plugins);\n\tconst byId = new Map<JsonPathPluginId, JsonPathPlugin>();\n\tfor (const p of ordered) byId.set(p.meta.id, p);\n\n\t// Dependency validation\n\tfor (const p of ordered) {\n\t\tfor (const dep of list(p.meta.dependsOn)) {\n\t\t\tif (!byId.has(dep)) {\n\t\t\t\tthrow new JsonPathError({\n\t\t\t\t\tcode: JsonPathErrorCodes.Plugin,\n\t\t\t\t\tmessage: \`Missing required plugin dependency: \${p.meta.id} depends on \${dep}\`,\n\t\t\t\t\tpluginIds: [p.meta.id, dep],\n\t\t\t\t});\n\t\t\t}\n\t\t}\n\t}\n\n\t// Capability conflict detection (exact match)\n\tconst capabilityToOwner = new Map<JsonPathCapability, JsonPathPluginId>();\n\tfor (const p of ordered) {\n\t\tfor (const cap of list(p.meta.capabilities)) {\n\t\t\tconst owner = capabilityToOwner.get(cap);\n\t\t\tif (owner && owner !== p.meta.id) {\n\t\t\t\tthrow new JsonPathError({\n\t\t\t\t\tcode: JsonPathErrorCodes.Plugin,\n\t\t\t\t\tmessage: \`Capability conflict: \${cap} claimed by \${owner} and \${p.meta.id}\`,\n\t\t\t\t\tpluginIds: [owner, p.meta.id],\n\t\t\t\t});\n\t\t\t}\n\t\t\tcapabilityToOwner.set(cap, p.meta.id);\n\t\t}\n\t}\n\n\treturn { ordered, byId };\n}\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'resolve.spec.ts'),
	`import { describe, expect, it } from 'vitest';\n\nimport { resolvePlugins } from './resolve';\n\nfunction plugin(id: string, caps: string[] = [], deps: string[] = []) {\n\treturn {\n\t\tmeta: { id, capabilities: caps, dependsOn: deps },\n\t};\n}\n\ndescribe('resolvePlugins', () => {\n\tit('orders deterministically by plugin id', () => {\n\t\tconst result = resolvePlugins([plugin('b'), plugin('a')]);\n\t\texpect(result.ordered.map((p) => p.meta.id)).toEqual(['a', 'b']);\n\t});\n\n\tit('throws when required dependencies are missing', () => {\n\t\texpect(() => resolvePlugins([plugin('a', [], ['missing'])])).toThrow(/Missing required plugin dependency/);\n\t});\n\n\tit('throws on capability conflicts', () => {\n\t\texpect(() => resolvePlugins([plugin('a', ['cap:x']), plugin('b', ['cap:x'])])).toThrow(/Capability conflict/);\n\t});\n});\n`,
);

write(
	path.join(pkgDir, 'src', 'plugins', 'registry.ts'),
	`import type { JsonPathPlugin, JsonPathPluginId } from './types';\n\nexport class PluginRegistry {\n\tprivate readonly pluginsById: Map<JsonPathPluginId, JsonPathPlugin> = new Map();\n\n\tpublic register(plugin: JsonPathPlugin): void {\n\t\tthis.pluginsById.set(plugin.meta.id, plugin);\n\t}\n\n\tpublic get(id: JsonPathPluginId): JsonPathPlugin | undefined {\n\t\treturn this.pluginsById.get(id);\n\t}\n\n\tpublic all(): readonly JsonPathPlugin[] {\n\t\treturn [...this.pluginsById.values()];\n\t}\n}\n`,
);

// Export from core index
const indexPath = path.join(pkgDir, 'src', 'index.ts');
const existingIndex = fs.readFileSync(indexPath, 'utf8');
if (!existingIndex.includes("from './plugins")) {
	fs.writeFileSync(
		indexPath,
		existingIndex +
			"\nexport type { JsonPathPlugin, JsonPathPluginMeta, JsonPathPluginId, JsonPathCapability } from './plugins/types';\nexport { resolvePlugins } from './plugins/resolve';\nexport { PluginRegistry } from './plugins/registry';\n",
		'utf8',
	);
}

console.log('Wrote @jsonpath/core plugin resolution + ordering');
