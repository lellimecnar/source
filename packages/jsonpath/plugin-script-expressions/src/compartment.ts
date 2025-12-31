import 'ses';

export type CreateCompartmentOptions = {
	endowments?: Record<string, unknown>;
};

export function createCompartment(options: CreateCompartmentOptions = {}) {
	const Compartment = globalThis.Compartment as unknown;
	if (typeof Compartment !== 'function') {
		throw new Error(
			'SES Compartment is not available. Ensure "ses" is installed and imported.',
		);
	}
	return new (Compartment as any)(options.endowments ?? {});
}
