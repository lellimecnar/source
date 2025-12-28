export interface ValidationOk {
	ok: true;
}

export interface ValidationFail {
	ok: false;
	errors: unknown;
}

export type ValidationResult = ValidationOk | ValidationFail;

export interface ValidationPlugin {
	name: string;
	// Schema refs are strings like "User"; the plugin decides resolution.
	validate: (value: unknown, schemaRef: string) => ValidationResult;
}
