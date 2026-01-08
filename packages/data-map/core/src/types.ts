export type Pointer = string;

export type Unsubscribe = () => void;

export interface SubscribeEvent {
	pointer: Pointer;
	value: unknown;
}
