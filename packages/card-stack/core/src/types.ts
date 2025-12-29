export type EnumType<
	Key extends string = string,
	Val extends number = number,
> = Record<Key & string, Val & number> &
	Record<Val & number, Key & string> & {
		[Symbol.iterator]: () => Generator<Val>;
	};

export type EnumKey<Enum extends EnumType> = keyof Enum & string;
export type EnumValue<Enum extends EnumType> = Enum[EnumKey<Enum>] & number;

export enum HexByte {
	CardRank = 0x0000000001,
	CardSuit = 0x0000000100,
	CardIndex = 0x0000010000,
	DeckIndex = 0x0001000000,
	ParentIndex = 0x0100000000,
	PlayerIndex = 0x10000000000,
}

export type RecursiveArray<T> = (T | RecursiveArray<T>)[];
