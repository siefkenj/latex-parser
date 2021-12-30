import { allEnvironments, allMacros } from "..";
import * as Ast from "../../libs/ast-types";

const MACRO_CACHE: WeakMap<Ast.Ast, Map<string, Ast.Macro[]>> = new WeakMap();
const ENVIRONMENT_CACHE: WeakMap<
    Ast.Ast,
    Map<string, Ast.Environment[]>
> = new WeakMap();

/**
 * Returns a list of all macros with the given name found in `ast`. This method caches
 * the results so multiple lookups don't involve traversing the `ast` multiple times.
 */
export function cachedMacroLookup(
    ast: Ast.Ast,
    macroName: string
): Ast.Macro[] {
    if (MACRO_CACHE.has(ast)) {
        return MACRO_CACHE.get(ast)?.get(macroName) || [];
    }
    const lookup = allMacros(ast);
    MACRO_CACHE.set(ast, lookup);
    return lookup.get(macroName) || [];
}

/**
 * Returns a list of all macros with the given name found in `ast`. This method caches
 * the results so multiple lookups don't involve traversing the `ast` multiple times.
 */
export function cachedEnvironmentLookup(
    ast: Ast.Ast,
    envName: string
): Ast.Environment[] {
    if (ENVIRONMENT_CACHE.has(ast)) {
        return ENVIRONMENT_CACHE.get(ast)?.get(envName) || [];
    }
    const lookup = allEnvironments(ast);
    ENVIRONMENT_CACHE.set(ast, lookup);
    return lookup.get(envName) || [];
}
