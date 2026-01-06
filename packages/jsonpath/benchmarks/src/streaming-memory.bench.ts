import { stream, queryValues } from '@jsonpath/jsonpath';
import { bench, describe } from 'vitest';

import { LARGE_ARRAY_10K } from './fixtures';

describe('Streaming & Memory', () => {
	const q = '$[*].value';

	describe('Streaming vs eager (first 10 results)', () => {
		bench('stream() early break', () => {
			const it = stream(LARGE_ARRAY_10K, q);
			let count = 0;

			for (const _ of it) {
				count++;
				if (count >= 10) break;
			}
		});

		bench('queryValues() eager', () => {
			const values = queryValues(LARGE_ARRAY_10K, q);

			void values.slice(0, 10);
		});
	});

	describe('Memory snapshot', () => {
		bench('process.memoryUsage after eager', () => {
			queryValues(LARGE_ARRAY_10K, q);
			process.memoryUsage();
		});
	});
});
