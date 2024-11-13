import camelCase from 'lodash/camelCase';
import chunk from 'lodash/chunk';
import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import findLast from 'lodash/findLast';
import findLastIndex from 'lodash/findLastIndex';
import flatten from 'lodash/flatten';
import flow from 'lodash/flow';
import forEachRight from 'lodash/forEachRight';
import groupBy from 'lodash/groupBy';
import nth from 'lodash/nth';
import orderBy from 'lodash/orderBy';
import pull from 'lodash/pull';
import pullAt from 'lodash/pullAt';
import reduceRight from 'lodash/reduceRight';
import remove from 'lodash/remove';
import sampleSize from 'lodash/sampleSize';
import shuffle from 'lodash/shuffle';
import take from 'lodash/take';
import takeRight from 'lodash/takeRight';
import upperFirst from 'lodash/upperFirst';

export { default as memoize } from 'lodash/memoize';

export const pascalCase = flow(camelCase, upperFirst);

export const randomIndexes = (array: Iterable<any>, count = 1) =>
	sampleSize(Array.from([...array].keys()), count);

export {
	camelCase,
	chunk,
	find,
	findIndex,
	findLast,
	findLastIndex,
	flatten,
	flow,
	forEachRight,
	groupBy,
	nth,
	orderBy,
	pull,
	pullAt,
	reduceRight,
	remove,
	sampleSize,
	shuffle,
	take,
	takeRight,
	upperFirst,
};

export type {
	Dictionary,
	List,
	ListIteratee,
	ListIterateeCustom,
	ListIterator,
	Many,
	NotVoid,
	ValueIteratee,
} from 'lodash';
