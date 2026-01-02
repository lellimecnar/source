export type LocationComponent =
	| { kind: 'member'; name: string }
	| { kind: 'index'; index: number };

export interface Location {
	components: readonly LocationComponent[];
}

export function rootLocation(): Location {
	return { components: [] };
}

export function appendMember(location: Location, name: string): Location {
	return { components: [...location.components, { kind: 'member', name }] };
}

export function appendIndex(location: Location, index: number): Location {
	return { components: [...location.components, { kind: 'index', index }] };
}
