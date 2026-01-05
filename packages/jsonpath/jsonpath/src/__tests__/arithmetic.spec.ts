import { describe, it, expect } from 'vitest';
import { query } from '../index.js';

describe('Arithmetic Operators', () => {
	const data = {
		items: [
			{ a: 10, b: 20, c: 5 },
			{ a: 1, b: 2, c: 3 },
		],
	};

	it('should handle addition', () => {
		const result = query(data, '$.items[?(@.a + @.b == 30)]');
		expect(result.values()).toHaveLength(1);
	});

	it('should handle subtraction', () => {
		const result = query(data, '$.items[?(@.b - @.a == 10)]');
		expect(result.values()).toHaveLength(1);
	});

	it('should handle multiplication', () => {
		const result = query(data, '$.items[?(@.a * @.c == 50)]');
		expect(result.values()).toHaveLength(1);
	});

	it('should handle division', () => {
		const result = query(data, '$.items[?(@.b / @.c == 4)]');
		expect(result.values()).toHaveLength(1);
	});

	it('should handle modulo', () => {
		const result = query(data, '$.items[?(@.a % 3 == 1)]');
		expect(result.values()).toHaveLength(2);
	});

	it('should handle unary minus', () => {
		const result = query(data, '$.items[?(-@.a == -10)]');
		expect(result.values()).toHaveLength(1);
	});

	it('should handle precedence', () => {
		const result = query(data, '$.items[?(@.a + @.b * @.c == 110)]');
		expect(result.values()).toHaveLength(1);
	});

	it('should handle parentheses', () => {
		const result = query(data, '$.items[?((@.a + @.b) * @.c == 150)]');
		expect(result.values()).toHaveLength(1);
	});
});
