export interface Issue {
	message: string;
	code?: string;
	path?: string;
	meta?: unknown;
}

export interface ValidatorAdapter {
	id: string;
	validate: (value: unknown) => readonly Issue[];
}

export interface ValidationItem {
	value: unknown;
	pointer: string;
	path: string;
	issues: Issue[];
}

export interface ValidationResult {
	ok: boolean;
	items: ValidationItem[];
}
