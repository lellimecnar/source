import { describe, expect, it } from 'vitest';
import { SyncMaterializePool } from '../worker-pool.js';

describe('worker-pool', () => {
	it('falls back to synchronous execution', async () => {
		const pool = new SyncMaterializePool();
		await expect(pool.materialize(() => 123)).resolves.toBe(123);
	});
});
