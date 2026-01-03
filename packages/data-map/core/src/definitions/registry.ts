import type { Definition, DefinitionFactory } from './types';
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
		if ('path' in def && typeof def.path === 'string') {
			this.defs.push({ def, pattern: compilePathPattern(def.path) });
			return;
		}
		this.defs.push({ def, pattern: null });
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

	getDepValues(def: Definition<T, Ctx>): unknown[] {
		const deps = def.deps ?? [];
		return deps.map((d) => this.dataMap.get(d, { strict: false }));
	}

	applyGetter(pointer: string, rawValue: unknown, ctx: Ctx): unknown {
		const defs = this.findForPointer(pointer);
		let v = rawValue;
		for (const def of defs) {
			if (!def.get) continue;
			const cfg = typeof def.get === 'function' ? { fn: def.get } : def.get;
			const depValues = (cfg.deps ?? def.deps ?? []).map((d) =>
				this.dataMap.get(d, { strict: false }),
			);
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
