import { PointerSyntaxError } from './errors.js';

function assertValidPointer(pointer: string, source: string): void {
	if (pointer === '') return;
	if (!pointer.startsWith('/')) {
		throw new PointerSyntaxError(
			'Invalid JSON Pointer URI fragment: decoded pointer must start with "/" or be empty',
			{ path: source },
		);
	}

	const parts = pointer.split('/').slice(1);
	for (const part of parts) {
		if (/~[^01]/.test(part) || part.endsWith('~')) {
			throw new PointerSyntaxError(
				`Invalid JSON Pointer URI fragment: invalid tilde sequence in segment "${part}"`,
				{ path: source },
			);
		}
	}
}

function encodeFragmentPointer(pointer: string): string {
	// RFC 6901 §6: percent-encode as UTF-8. Keep '/' unescaped for readability.
	return encodeURIComponent(pointer).replaceAll('%2F', '/');
}

export function toURIFragment(pointer: string): string {
	assertValidPointer(pointer, pointer);
	return `#${encodeFragmentPointer(pointer)}`;
}

export function fromURIFragment(fragment: string): string {
	const raw = fragment.startsWith('#') ? fragment.slice(1) : fragment;
	if (raw === '') return '';

	let decoded: string;
	try {
		decoded = decodeURIComponent(raw);
	} catch (cause) {
		throw new PointerSyntaxError(
			'Invalid JSON Pointer URI fragment: percent-decoding failed',
			{ path: fragment, cause: cause as Error },
		);
	}

	assertValidPointer(decoded, fragment);
	return decoded;
}
