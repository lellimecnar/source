import { sets, type SetId } from './_data';

export const defaultSelectedSets = sets.map((set) => set.id);

export const defaultValues: ControlsState = {
	sectionCount: 6,
	showSectionGrid: true,
	selectedSets: defaultSelectedSets,
	numberSections: true,
};
export interface ControlsState {
	sectionCount: number;
	showSectionGrid: boolean;
	numberSections: boolean;
	selectedSets: SetId[];
}
