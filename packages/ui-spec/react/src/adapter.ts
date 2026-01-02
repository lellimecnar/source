import type { ComponentType } from 'react';

export interface UISpecComponentAdapter {
	getComponents: () => Record<string, ComponentType<any>>;
}
