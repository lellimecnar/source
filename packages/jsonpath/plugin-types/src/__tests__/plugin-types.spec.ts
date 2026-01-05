import { describe, it, expect, beforeEach } from 'vitest';
import { evaluate } from '@jsonpath/evaluator';
import { parse } from '@jsonpath/parser';
import { functionRegistry } from '@jsonpath/core';
import { types } from '../index.js';

describe('TypePlugin', () => {
	beforeEach(() => {
		// Clear registry and register plugin
		const plugin = types();
		(plugin as any).onRegister();
	});

	describe('predicates', () => {
		const data = [
			{
				str: 'hello',
				num: 123,
				bool: true,
				obj: { a: 1 },
				arr: [1, 2],
				nil: null,
			},
		];

		it('is_string works', () => {
			expect(
				evaluate(data, parse('$[?(is_string(@.str))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(is_string(@.num))]')).values(),
			).toHaveLength(0);
		});

		it('is_number works', () => {
			expect(
				evaluate(data, parse('$[?(is_number(@.num))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(is_number(@.str))]')).values(),
			).toHaveLength(0);
		});

		it('is_boolean works', () => {
			expect(
				evaluate(data, parse('$[?(is_boolean(@.bool))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(is_boolean(@.str))]')).values(),
			).toHaveLength(0);
		});

		it('is_object works', () => {
			expect(
				evaluate(data, parse('$[?(is_object(@.obj))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(is_object(@.arr))]')).values(),
			).toHaveLength(0);
		});

		it('is_array works', () => {
			expect(
				evaluate(data, parse('$[?(is_array(@.arr))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(is_array(@.obj))]')).values(),
			).toHaveLength(0);
		});

		it('is_null works', () => {
			expect(
				evaluate(data, parse('$[?(is_null(@.nil))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(is_null(@.str))]')).values(),
			).toHaveLength(0);
		});
	});

	describe('coercion', () => {
		const data = [
			{
				str: '123',
				num: 123,
				bool: true,
				obj: { a: 1 },
				arr: [1, 2],
				nil: null,
			},
		];

		it('to_string works', () => {
			// We can't easily test ValueType return in filter without comparison
			expect(
				evaluate(data, parse('$[?(to_string(@.num) == "123")]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(to_string(@.bool) == "true")]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(to_string(@.nil) == "null")]')).values(),
			).toHaveLength(1);
		});

		it('to_number works', () => {
			expect(
				evaluate(data, parse('$[?(to_number(@.str) == 123)]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(to_number(@.bool) == 1)]')).values(),
			).toHaveLength(1);
		});

		it('to_boolean works', () => {
			expect(
				evaluate(data, parse('$[?(to_boolean(@.str))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate(data, parse('$[?(to_boolean(@.num))]')).values(),
			).toHaveLength(1);
			expect(
				evaluate([{ str: '' }], parse('$[?(to_boolean(@.str))]')).values(),
			).toHaveLength(0);
		});
	});
});
