import type { Definition, DefinitionFactory, GetterConfig } from './types';
import type { DataMap } from '../datamap';
import type { CompiledPathPattern } from '../path/compile';
import { compilePathPattern } from '../path/compile';

interface InternalDefinition<T, Ctx> {
	def: Definition<T, Ctx>;
	pattern: CompiledPathPattern | null;
}

export class DefinitionRegistry<T, Ctx> {
	private readonly defs: InternalDefinition<T, Ctx>[] = [];
	private readonly dataMap: DataMap<T, Ctx>;

	// Cache getter outputs per (definition object, pointer)
	private readonly getterCache = new WeakMap<
		Definition<T, Ctx>,
		Map<string, unknown>
	>();
	private readonly getterCacheValid = new WeakMap<
		Definition<T, Ctx>,
		Set<string>
	>();

	constructor(dataMap: DataMap<T, Ctx>) {
		this.dataMap = dataMap;
	}

	registerAll(
		items: (Definition<T, Ctx> | DefinitionFactory<T, Ctx>)[],
		ctx: Ctx,
	): void {
		for (const item of items) {
			const defs =
				typeof item === 'function' ? (item as any)(this.dataMap, ctx) : item;
			const list = Array.isArray(defs) ? defs : [defs];
			for (const def of list) this.register(def);
		}
	}

	register(def: Definition<T, Ctx>): void {
		const entry: InternalDefinition<T, Ctx> = {
			def,
			pattern:
				'path' in def && typeof def.path === 'string'
					? compilePathPattern(def.path)
					: null,
		};
		this.defs.push(entry);

		// AC-031: Auto-subscribe to dependencies for invalidation
		const getDeps =
			typeof def.get === 'object' && def.get !== null ? def.get.deps : [];
		const deps = [...(def.deps ?? []), ...(getDeps ?? [])];

		if (deps.length > 0) {
			for (const dep of deps) {
				this.dataMap.subscribe({
					path: dep,
					on: ['set', 'remove', 'patch'],
					fn: () => {
						if ('pointer' in def && typeof def.pointer === 'string') {
							this.invalidateDefinitionForPointer(def, def.pointer);
						} else {
							this.invalidateAllForDefinition(def);
						}
					},
				});
			}
		}
	}

	getRegisteredDefinitions(): Definition<T, Ctx>[] {
		return this.defs.map((d) => d.def);
	}

	getDepValues(def: Definition<T, Ctx>): unknown[] {
		const getDeps =
			typeof def.get === 'object' && def.get !== null ? def.get.deps : [];
		const deps = [...(def.deps ?? []), ...(getDeps ?? [])];
		return deps.map((d) => this.dataMap.get(d, { strict: false }));
	}

	invalidateDefinitionForPointer(
		def: Definition<T, Ctx>,
		pointer: string,
	): void {
		const valid = this.getterCacheValid.get(def);
		valid?.delete(pointer);
	}

	invalidateAllForDefinition(def: Definition<T, Ctx>): void {
		this.getterCacheValid.delete(def);
	}

	findForPointer(pointer: string): Definition<T, Ctx>[] {
		const matches: Definition<T, Ctx>[] = [];
		const getValue = (p: string) => this.dataMap.get(p);
		for (const entry of this.defs) {
			if (entry.pattern) {
				if (entry.pattern.match(pointer, getValue).matches)
					matches.push(entry.def);
				continue;
			}
			if ('pointer' in entry.def && entry.def.pointer === pointer)
				matches.push(entry.def);
		}
		return matches;
	}

	applyGetter(pointer: string, rawValue: unknown, ctx: Ctx): unknown {
		const defs = this.findForPointer(pointer);
		let v = rawValue;

		for (const def of defs) {
			if (!def.get) continue;
			const cfg: GetterConfig<T, Ctx> =
				typeof def.get === 'function' ? { fn: def.get } : def.get;

			const deps = cfg.deps ?? def.deps ?? [];
			const depValues = deps.map((d) => this.dataMap.get(d, { strict: false }));

			// Only cache getters that declare dependencies.
			if (deps.length > 0) {
				let map = this.getterCache.get(def);
				if (!map) {
					map = new Map();
					this.getterCache.set(def, map);
				}
				let valid = this.getterCacheValid.get(def);
				if (!valid) {
					valid = new Set();
					this.getterCacheValid.set(def, valid);
				}

				if (valid.has(pointer)) {
					v = map.get(pointer);
					continue;
				}

				v = cfg.fn(v, depValues, this.dataMap, ctx);
				map.set(pointer, v);
				valid.add(pointer);
				continue;
			}

			v = cfg.fn(v, depValues, this.dataMap, ctx);
		}

		return v;
	}

	applySetter(
		pointer: string,
		newValue: unknown,
		currentValue: unknown,
		ctx: Ctx,
	): unknown {
		const defs = this.findForPointer(pointer);
		for (const def of defs) {
			if (def.readOnly) throw new Error(`Read-only path: ${pointer}`);
			if (!def.set) continue;
			const cfg = typeof def.set === 'function' ? { fn: def.set } : def.set;
			const depValues = (cfg.deps ?? def.deps ?? []).map((d) =>
				this.dataMap.get(d, { strict: false }),
			);
			return cfg.fn(newValue, currentValue, depValues, this.dataMap, ctx);
		}
		return newValue;
	}
}
