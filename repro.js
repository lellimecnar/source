const CHAR_FLAGS = new Uint8Array(128);
const IS_DIGIT = 1 << 1;
for (let i = 0; i < 128; i++) {
	if (/[0-9]/.test(String.fromCharCode(i))) {
		CHAR_FLAGS[i] |= IS_DIGIT;
	}
}

function readNumber(input) {
	let pos = 0;
	let raw = '';
	if (input.charCodeAt(pos) === 45) {
		// -
		raw += '-';
		pos++;
	}
	const firstDigit = input.charCodeAt(pos);
	if (firstDigit === 48) {
		// 0
		raw += '0';
		pos++;
		const nextChar = input.charCodeAt(pos);
		if (nextChar >= 48 && nextChar <= 57) {
			throw new Error('Leading zeros');
		}
	} else if (firstDigit >= 49 && firstDigit <= 57) {
		// 1-9
		while (pos < input.length) {
			const code = input.charCodeAt(pos);
			if (code < 128 && CHAR_FLAGS[code] & IS_DIGIT) {
				raw += input[pos];
				pos++;
			} else {
				break;
			}
		}
	} else {
		throw new Error(`Expected digit in number at ${pos} char=${input[pos]}`);
	}
	return raw;
}

console.log('10:', readNumber('10'));
console.log('-1:', readNumber('-1'));
console.log('0:', readNumber('0'));
try {
	console.log('01:', readNumber('01'));
} catch (e) {
	console.log('01 error:', e.message);
}
try {
	console.log('-:', readNumber('-'));
} catch (e) {
	console.log('- error:', e.message);
}
