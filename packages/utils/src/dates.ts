import { setDefaultOptions } from 'date-fns';
import { enUS } from 'date-fns/locale';

setDefaultOptions({
	locale: enUS,
});

export * from 'date-fns';
