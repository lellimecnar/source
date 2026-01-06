import { stream, queryValues } from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

import { LARGE_ARRAY_10K } from './fixtures/index.js';

describe('Streaming & Memory', () => {
	const q = '$[*].value';

	describe('Streaming vs eager (first 10 results)', () => {
		bench('stream() early break', () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
			const it = stream(LARGE_ARRAY_10K, q);
			let count = 0;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
			for (const _ of it) {
				count++;
				if (count >= 10) break;
			}
		});

		bench('queryValues() eager', () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
			const values = queryValues(LARGE_ARRAY_10K, q);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			void values.slice(0, 10);
		});
	});

	describe('Memory snapshot', () => {
		bench('process.memoryUsage after eager', () => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument
			queryValues(LARGE_ARRAY_10K, q);
			process.memoryUsage();
		});
	});
});
