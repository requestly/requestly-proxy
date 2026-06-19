/**
 * Verify that a rule's code string parses as a function WITHOUT executing it in
 * the host. Compiling in a throwaway isolate proves it parses; no host globals
 * are exposed and nothing runs. Returns true if it is valid function source.
 */
export declare const isValidFunctionString: (functionStringEscaped: string) => Promise<boolean>;
export declare function executeUserFunction(ctx: any, functionString: string, args: any): Promise<any>;
