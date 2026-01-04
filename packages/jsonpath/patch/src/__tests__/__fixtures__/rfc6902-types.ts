import type { PatchOperation } from '../../patch.js';

export interface RFC6902TestCase {
	comment?: string;
	doc: unknown;
	patch: PatchOperation[];
	expected?: unknown;
	error?: string;
	disabled?: boolean;
}
