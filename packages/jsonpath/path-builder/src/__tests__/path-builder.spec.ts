import { describe, it, expect } from 'vitest';
import { jp } from '../index.js';

describe('PathBuilder', () => {
	it('should build simple paths', () => {
		expect(jp.root().child('store').child('book').build()).toBe('$.store.book');
	});

	it('should handle special characters in child names', () => {
		expect(jp.root().child('my-key').build()).toBe("$['my-key']");
		expect(jp.root().child("it's").build()).toBe("$['it\\'s']");
	});

	it('should build index and slice paths', () => {
		expect(jp.root().child('book').index(0).build()).toBe('$.book[0]');
		expect(jp.root().child('book').slice(1, 3).build()).toBe('$.book[1:3]');
		expect(jp.root().child('book').slice(undefined, undefined, 2).build()).toBe(
			'$.book[::2]',
		);
	});

	it('should build wildcard and descendant paths', () => {
		expect(jp.root().wildcard().build()).toBe('$.*');
		expect(jp.root().descendant().child('price').build()).toBe('$..price');
	});

	it('should build filter paths', () => {
		expect(jp.root().child('book').filter('@.price < 10').build()).toBe(
			'$.book[?(@.price < 10)]',
		);
	});

	it('should support current node reference', () => {
		expect(jp.current().child('a').build()).toBe('@.a');
	});
});
