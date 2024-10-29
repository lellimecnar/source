import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

export const TW_W_1 = 0.25; // rem
const w = (units: number, includeUnit?: boolean): string | number => {
	const val = units * TW_W_1;

	return includeUnit ? `${String(val)}rem` : val;
};

export const tw = {
	w,
} as const;
