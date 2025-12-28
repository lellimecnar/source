export function toReactEventProp(eventName: string): string {
	// Spec uses lower-case DOM event names (click, change, input, submit, ...)
	// React expects onClick, onChange, onInput, onSubmit, ...
	return `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
}
