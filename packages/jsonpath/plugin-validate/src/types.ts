export type Issue = {
	message: string;
	code?: string;
	path?: string;
	meta?: unknown;
};

export type ValidatorAdapter = {
	id: string;
	validate: (value: unknown) => readonly Issue[];
};
