import { compilePattern } from './pattern-compiler.js';
import { PatternTrie } from './pattern-trie.js';
import type { CompiledPattern, Pointer, Subscription } from './types.js';

export class PatternIndex {
	private trie = new PatternTrie<Subscription>();
	private trieEntries = new Map<
		symbol,
		{ sub: Subscription; trieSegments: string[] }
	>();
	private fallbackEntries = new Map<
		symbol,
		{ compiled: CompiledPattern; sub: Subscription }
	>();

	add(sub: Subscription): void {
		const trieRes = this.trie.add(sub.pattern, sub);
		if (trieRes.eligible) {
			this.trieEntries.set(sub.id, {
				sub,
				trieSegments: trieRes.segments,
			});
			return;
		}
		const compiled = compilePattern(sub.pattern);
		this.fallbackEntries.set(sub.id, { compiled, sub });
	}

	delete(sub: Subscription): void {
		const trieEntry = this.trieEntries.get(sub.id);
		if (trieEntry) {
			this.trie.remove(trieEntry.trieSegments, sub);
			this.trieEntries.delete(sub.id);
			return;
		}
		this.fallbackEntries.delete(sub.id);
	}

	match(pointer: Pointer): Subscription[] {
		const out = new Set<Subscription>();

		// Fast path: trie-eligible patterns.
		for (const sub of this.trie.match(pointer)) out.add(sub);

		// Compatibility fallback: patterns that are not trie-eligible.
		for (const entry of this.fallbackEntries.values()) {
			if (entry.compiled.matchesPointer(pointer)) out.add(entry.sub);
		}

		return Array.from(out);
	}
}
