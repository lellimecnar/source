export const calcDiagonal = (width: number, length: number): number =>
	Math.sqrt(Math.pow(width, 2) + Math.pow(length, 2));

export const calcSize = (diagonal: number, height: number): number =>
	Math.ceil(diagonal + height * 1.5);

export const validate = (
	width: number,
	length: number,
	height: number,
): boolean =>
	Boolean(
		!isNaN(width) &&
			width > 0 &&
			!isNaN(length) &&
			length > 0 &&
			!isNaN(height) &&
			height > 0,
	);

export const calcAngle = (
	[x1, y1]: [number, number],
	[x2, y2]: [number, number],
): number => (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

export const calcCoordinates = (
	width: number,
	length: number,
	size: number,
): [number, number] => [(size - width) / 2, (size - length) / 2];

export const calcRotate = (
	width: number,
	length: number,
	size: number,
): number => {
	const p1 = calcCoordinates(width, length, size);

	return calcAngle(p1, [size / 2, size / 2]);
};

export const num2frac = (() => {
	const almostEq = (a: number, b: number): boolean =>
		Math.abs(a - b) <= 9.5367432e-7;
	const GCD = (a: number, b: number): number =>
		almostEq(b, 0) ? a : GCD(b, a % b);
	const findPrecision = (n: number): number => {
		let e = 1;

		while (!almostEq(Math.round(n * e) / e, n)) {
			e *= 10;
		}

		return e;
	};

	return (num: number | `${number}`): string => {
		if (num === Infinity) {
			return 'Infinity';
		}

		if (num === 0 || num === '0') {
			return '0';
		}

		if (typeof num === 'string') {
			num = parseFloat(num);
		}

		const prec = findPrecision(num);
		const number = num * prec;
		const gcd = Math.abs(GCD(number, prec));
		const numerator = number / gcd;
		const denominator = prec / gcd;

		return `${String(Math.round(numerator))}⁄${String(Math.round(denominator))}`;
	};
})();

export const toFraction = (dec: number): string => {
	dec = Math.round(dec * 4) / 4;
	const whole = Math.floor(dec);
	const rem = dec - whole;
	const frac = rem ? num2frac(rem) : '';

	return `${String(whole)} ${frac}`.trim();
};

export const IN = 50;
