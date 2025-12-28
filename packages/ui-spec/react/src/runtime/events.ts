export function toReactEventProp(eventName: string): string {
	if (!eventName) return 'on';
	return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
}
