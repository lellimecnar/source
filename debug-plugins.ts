import { PluginManager } from '@jsonpath/core/src/plugins.js';
import { hasFunction, getFunction } from '@jsonpath/core/src/src';
import { arithmetic } from '@jsonpath/plugin-arithmetic/src/src';
import { extras } from '@jsonpath/plugin-extras/src/src';

PluginManager.from({ plugins: [arithmetic(), extras()] });

console.log('has add:', hasFunction('add'));
console.log('has values:', hasFunction('values'));
console.log('has unique:', hasFunction('unique'));
console.log('has length:', hasFunction('length'));

const valuesFn = getFunction('values');
console.log('values signature:', valuesFn?.signature);
console.log('values evaluate:', valuesFn?.evaluate({ a: 1, b: 2 }));
