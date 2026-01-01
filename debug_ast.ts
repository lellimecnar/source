import { SelectorKinds, FilterExprKinds } from '@jsonpath/ast/src/src';
import { parse } from '@jsonpath/parser/src/src';

const query = '@.author';
// We need to parse it as a filter expression or something.
// Actually, the filter plugin parses it.
// Let's see how it's parsed.
