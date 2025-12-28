import { parseUISpecSchema, type UISpecSchema } from '@ui-spec/core';

export async function fetchSchema(url: string): Promise<UISpecSchema> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch schema: ${res.status}`);
	const json = await res.json();
	return parseUISpecSchema(json);
}
