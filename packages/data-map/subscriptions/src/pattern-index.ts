import type { CompiledPattern, Pointer, Subscription } from './types.js';
import { compilePattern } from './pattern-compiler.js';

export class PatternIndex {
	private patterns = new Map<
		symbol,
		{ compiled: CompiledPattern; sub: Subscription }
	>();

	add(sub: Subscription): void {
		const compiled = compilePattern(sub.pattern);
		this.patterns.set(sub.id, { compiled, sub });
	}

	delete(sub: Subscription): void {
		this.patterns.delete(sub.id);
	}

	match(pointer: Pointer): Subscription[] {
		const out: Subscription[] = [];
		for (const { compiled, sub } of this.patterns.values()) {
			if (compiled.matchesPointer(pointer)) out.push(sub);
		}
		return out;
	}
}
