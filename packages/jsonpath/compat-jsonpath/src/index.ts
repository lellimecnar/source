import jp from 'jsonpath';

// Minimal drop-in surface: re-export the library API.

export default jp;

export const query = (jp as any).query.bind(jp);
export const value = (jp as any).value.bind(jp);
export const paths = (jp as any).paths.bind(jp);
export const nodes = (jp as any).nodes.bind(jp);
export const parent = (jp as any).parent.bind(jp);
export const apply = (jp as any).apply.bind(jp);
