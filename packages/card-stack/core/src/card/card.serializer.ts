import { Card, toHex } from '..';

export default {
	test: (val: unknown) => val instanceof Card,
	serialize: (val: Card) => toHex(val.id),
};
