export class AccessTracker<T extends object> {
	private readonly accessed = new Set<string>();
	private readonly modified = new Set<string>();

	track(obj: T, path = ''): T {
		return new Proxy(obj, {
			get: (target, prop) => {
				const fullPath = `${path}/${String(prop)}`;
				this.accessed.add(fullPath);
				const value = Reflect.get(target, prop);
				if (typeof value === 'object' && value !== null) {
					return this.track(value as any, fullPath);
				}
				return value;
			},
			set: (target, prop, value) => {
				const fullPath = `${path}/${String(prop)}`;
				this.modified.add(fullPath);
				return Reflect.set(target, prop, value);
			},
		});
	}

	getAccessed(): Set<string> {
		return new Set(this.accessed);
	}

	getModified(): Set<string> {
		return new Set(this.modified);
	}
}
