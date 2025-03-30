export const toHex = (value: number): string => {
	value = Math.min(255, Math.max(0, Math.round(value)));

	const hex = value.toString(16);
	if (hex.length < 2) {
		return `0${hex}`;
	}

	return hex;
};

export type RGB = [red: number, green: number, blue: number];
export const rgb2hex = (...[r, g, b]: RGB): string =>
	`#${toHex(r)}${toHex(g)}${toHex(b)}`;

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max);

export const hex2rgb = (hex: string): RGB => {
	const [r, g, b] = hex
		.replace('#', '')
		.match(/.{2}/g)!
		.map((x) => clamp(Math.round(parseInt(x, 16)), 0, 255)) as RGB;

	return [r, g, b] as const;
};

export const shade: {
	(color: string | RGB, amount: number, asRGB?: boolean): string;
	(color: string | RGB, amount: number, asRGB: true): RGB;
} = (color: string | RGB, amount: number, asRGB?: boolean): any => {
	let [r, g, b] = typeof color === 'string' ? hex2rgb(color) : color;

	r = clamp(Math.round(amount * r), 0, 255);
	g = clamp(Math.round(amount * g), 0, 255);
	b = clamp(Math.round(amount * b), 0, 255);

	if (asRGB === true) {
		return [r, g, b];
	}

	return rgb2hex(r, g, b);
};
