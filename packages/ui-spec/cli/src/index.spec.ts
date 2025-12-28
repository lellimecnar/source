import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { validateCommand } from './commands/validate';

describe('cli commands', () => {
	it('validateCommand returns ok for basic schema', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'uispec-'));
		const file = join(dir, 'schema.json');
		await writeFile(
			file,
			JSON.stringify({ $uispec: '1.0', root: { type: 'div' } }),
			'utf8',
		);
		const result = await validateCommand(file);
		expect(result.ok).toBe(true);
	});
});
