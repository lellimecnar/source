import { UISpecError } from './errors';

export class ComponentRegistry<TComponent> {
	private readonly map = new Map<string, TComponent>();

	public register(id: string, component: TComponent): void {
		this.map.set(id, component);
	}

	public get(id: string): TComponent | undefined {
		return this.map.get(id);
	}

	public require(id: string): TComponent {
		const component = this.map.get(id);
		if (!component) {
			throw new UISpecError(
				'UI_SPEC_COMPONENT_NOT_FOUND',
				`UI-Spec component not found: ${id}`,
				{ id },
			);
		}
		return component;
	}
}
