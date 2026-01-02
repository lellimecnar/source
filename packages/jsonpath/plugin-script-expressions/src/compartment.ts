import 'ses';

export interface CreateCompartmentOptions {
	endowments?: Record<string, unknown>;
}

export function createCompartment(options: CreateCompartmentOptions = {}) {
	const Compartment = (globalThis as any).Compartment;
	if (typeof Compartment !== 'function') {
		throw new Error(
			'SES Compartment is not available. Ensure "ses" is installed and imported.',
		);
	}
	return new Compartment(options.endowments ?? {});
}
