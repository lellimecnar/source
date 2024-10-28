import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export const TW_W_1 = 0.25; // rem
const w: <T extends boolean>(
	units: number,
	includeUnit?: T,
) => T extends true ? `${number}rem` : number = (
	units: number,
	includeUnit?: boolean,
) => {
	const val = units * TW_W_1;

	if (includeUnit) {
		return `${String(val)}rem`;
	}

	return val;
};

export const tw = {
	w,
} as const;
