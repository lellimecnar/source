import camelCase from 'lodash/camelCase';
import flow from 'lodash/flow';
import upperFirst from 'lodash/upperFirst';

export { default as memoize } from 'lodash/memoize';

export const pascalCase = flow(camelCase, upperFirst);

export { camelCase, flow, upperFirst };
