import { extractIndex, HexByte, toHex } from '.';

describe.skip('utils', () => {
	describe('toHex', () => {
		it('converts number to 10 digit hex code', () => {
			expect(toHex(0x0fa9c48)).toBe('0x0000FA9C48');
			expect(toHex(0x03f2c5e)).toBe('0x00003F2C5E');
			expect(toHex(0x01adb5b)).toBe('0x00001ADB5B');
			expect(toHex(0x0be935d)).toBe('0x0000BE935D');
			expect(toHex(0x0a82116)).toBe('0x0000A82116');
			expect(toHex(0x199c299803)).toBe('0x199C299803');
			expect(toHex(0x6e7fdc2960)).toBe('0x6E7FDC2960');
			expect(toHex(0x87e2fb118f)).toBe('0x87E2FB118F');
			expect(toHex(0x789e27e011)).toBe('0x789E27E011');
			expect(toHex(0xd2a3567593)).toBe('0xD2A3567593');
		});
	});

	describe('extractIndex', () => {
		it('extracts index from hex code', () => {
			expect(extractIndex(0x789e27e011, 0x0000000001)).toBe(0x0000000011);
			expect(extractIndex(0x789e27e011, 0x0000000100)).toBe(0x000000e000);
			expect(extractIndex(0x789e27e011, 0x0000010000)).toBe(0x0000270000);
			expect(extractIndex(0x789e27e011, 0x0001000000)).toBe(0x009e000000);
			expect(extractIndex(0x789e27e011, 0x0100000000)).toBe(0x7800000000);
		});

		it('accepts a HexByte value as a mask', () => {
			expect(extractIndex(0x789e27e011, HexByte.CardRank)).toBe(0x0000000011);
			expect(extractIndex(0x789e27e011, HexByte.CardSuit)).toBe(0x000000e000);
			expect(extractIndex(0x789e27e011, HexByte.CardIndex)).toBe(0x0000270000);
			expect(extractIndex(0x789e27e011, HexByte.DeckIndex)).toBe(0x009e000000);
			expect(extractIndex(0x789e27e011, HexByte.ParentIndex)).toBe(
				0x7800000000,
			);
		});
	});
});
