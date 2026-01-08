import rfdc from 'rfdc';

const clone = rfdc({ circles: false, proto: false });

export function cloneSnapshot<T>(value: T): T {
	return clone(value);
}
