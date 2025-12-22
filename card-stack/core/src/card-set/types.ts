import { type List } from '@lellimecnar/utils';

import { type Card } from '..';

export type CardSetFilterPredicate = Parameters<
	typeof import('@lellimecnar/utils').remove<List<Card>>
>[1];
