import { describe, expect, it } from 'vitest';

import { PatternTrie } from '../pattern-trie.js';

describe('PatternTrie', () => {
	it('matches exact segments', () => {
		const trie = new PatternTrie<string>();
		trie.add('$.users[*].name', 'v');
		expect(Array.from(trie.match('/users/0/name'))).toEqual(['v']);
		expect(Array.from(trie.match('/users/0/age'))).toEqual([]);
	});

	it('matches single wildcard (*) segments', () => {
		const trie = new PatternTrie<string>();
		trie.add('$.users[*].name', 'v');
		expect(Array.from(trie.match('/users/123/name'))).toEqual(['v']);
	});

	it('matches recursive descent via ** conversion', () => {
		const trie = new PatternTrie<string>();
		trie.add('$..name', 'v');
		expect(Array.from(trie.match('/users/0/name'))).toEqual(['v']);
		expect(Array.from(trie.match('/org/name'))).toEqual(['v']);
		expect(Array.from(trie.match('/org/title'))).toEqual([]);
	});

	it('supports removing patterns', () => {
		const trie = new PatternTrie<string>();
		const a = trie.add('$.users[*].name', 'a');
		expect(a.eligible).toBe(true);
		expect(Array.from(trie.match('/users/0/name'))).toEqual(['a']);
		trie.remove(a.segments, 'a');
		expect(Array.from(trie.match('/users/0/name'))).toEqual([]);
	});
});
