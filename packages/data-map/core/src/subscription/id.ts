let counter = 0;

export function generateSubscriptionId(): string {
	counter++;
	return `sub_${Date.now()}_${counter}`;
}
