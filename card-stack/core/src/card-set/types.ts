import { type Card } from '..';

export type CardSetFilterPredicate = Parameters<
	typeof import('@lellimecnar/utils').remove<Card>
>[1];
