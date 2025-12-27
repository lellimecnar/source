import { from, hasMixin, mix } from '..';

describe('polymix', () => {
	// Define some mixins
	class Identifiable {
		id = 'test-id';

		getId(): string {
			return this.id;
		}
	}

	class Timestamped {
		createdAt: Date = new Date();
		updatedAt: Date = new Date();

		touch(): void {
			this.updatedAt = new Date();
		}
	}

	class Serializable {
		toJSON(): object {
			const obj: Record<string, any> = {};
			for (const key of Object.keys(this)) {
				obj[key] = (this as any)[key];
			}
			return obj;
		}

		static fromJSON<T extends object>(this: new () => T, json: object): T {
			return Object.assign(new this(), json);
		}
	}

	class Validatable {
		errors: string[] = [];

		validate(): boolean {
			return this.errors.length === 0;
		}

		addError(msg: string): void {
			this.errors.push(msg);
		}

		clearErrors(): void {
			this.errors = [];
		}
	}

	// Compose them!
	class User extends mix(Identifiable, Timestamped, Serializable, Validatable) {
		name: string;
		email: string;

		constructor(name: string, email: string) {
			super();
			this.name = name;
			this.email = email;
		}

		validate(): boolean {
			this.clearErrors();
			if (!this.email.includes('@')) {
				this.addError('Invalid email');
			}
			if (this.name.length < 2) {
				this.addError('Name too short');
			}
			return this.errors.length === 0;
		}
	}

	it('should create a mixed instance with properties from all mixins', () => {
		const user = new User('Alice', 'alice@example.com');

		expect(user.name).toBe('Alice');
		expect(user.email).toBe('alice@example.com');
		expect(user.id).toBe('test-id');
		expect(user.createdAt).toBeInstanceOf(Date);
		expect(user.errors).toEqual([]);
	});

	it('should support instanceof checks', () => {
		const user = new User('Alice', 'alice@example.com');

		expect(user).toBeInstanceOf(User);
		expect(user).toBeInstanceOf(Identifiable);
		expect(user).toBeInstanceOf(Timestamped);
		expect(user).toBeInstanceOf(Serializable);
		expect(user).toBeInstanceOf(Validatable);
	});

	it('should support hasMixin type guard', () => {
		const user = new User('Alice', 'alice@example.com');

		if (hasMixin(user, Timestamped)) {
			user.touch();
			expect(user.updatedAt).toBeInstanceOf(Date);
		} else {
			fail('hasMixin should return true');
		}
	});

	it('should support disambiguation with from()', () => {
		const user = new User('Alice', 'alice@example.com');
		expect(from(user, Identifiable).getId()).toBe('test-id');
	});

	it('should correctly override methods', () => {
		const user = new User('A', 'not-an-email');
		const isValid = user.validate();

		expect(isValid).toBe(false);
		expect(user.errors).toContain('Invalid email');
		expect(user.errors).toContain('Name too short');
	});

	it('should support static methods', () => {
		const user = (User as any).fromJSON({
			name: 'Bob',
			email: 'bob@example.com',
		});
		expect(user).toBeInstanceOf(User);
		expect(user.name).toBe('Bob');
	});
});
