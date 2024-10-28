import { camelCase, flow, upperFirst } from 'lodash-es/';

export * from 'lodash-es';

export const pascalCase = flow(camelCase, upperFirst);
