import { parseUISpecSchema } from './parse';

describe('parseUISpecSchema', () => {
	it('parses a minimal valid schema', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: {
				type: 'div',
				children: 'hello',
			},
		});

		expect(schema.$uispec).toBe('1.0');
		expect(schema.root.type).toBe('div');
	});

	it('rejects invalid version', () => {
		expect(() =>
			parseUISpecSchema({
				$uispec: '2.0',
				root: { type: 'div' },
			}),
		).toThrow(/expected \"1\.0\"/);
	});

	it('rejects invalid children', () => {
		expect(() =>
			parseUISpecSchema({
				$uispec: '1.0',
				root: { type: 'div', children: 123 },
			}),
		).toThrow(/Invalid children/);
	});

	it('accepts $path binding in children', () => {
		const schema = parseUISpecSchema({
			$uispec: '1.0',
			root: { type: 'span', children: { $path: '$.user.name' } },
		});

		expect(schema.root.type).toBe('span');
	});
});
