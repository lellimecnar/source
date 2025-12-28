import { parseUISpecSchema } from '@ui-spec/core';
import { readFile } from 'node:fs/promises';

export async function validateCommand(
	filePath: string,
): Promise<{ ok: boolean; error?: string }> {
	try {
		const raw = await readFile(filePath, 'utf8');
		parseUISpecSchema(JSON.parse(raw));
		return { ok: true };
	} catch (err) {
		return { ok: false, error: (err as Error).message };
	}
}
