import type { ComponentType } from 'react';

export type UISpecComponentAdapter = {
	getComponents(): Record<string, ComponentType<any>>;
};
