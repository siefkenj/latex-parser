import { match, walkAst } from "../libs/ast";
import * as Ast from "../libs/ast-types";
import { printRaw } from "../libs/print-raw";
import { parsePgfkeys } from "../parsers/pgfkeys-parser";

/**
 * Returns a set containing all macros in the document.
 *
 * @export
 * @param {Ast.Ast} ast
 * @returns {Map<string, Ast.Macro>}
 */
export function allMacros(ast: Ast.Ast): Map<string, Ast.Macro[]> {
    const ret: Map<string, Ast.Macro[]> = new Map();
    walkAst(
        ast,
        (node) => {
            const name = node.content;
            let newVal = ret.get(name) || [];
            newVal.push(node);
            ret.set(name, newVal);
            return node;
        },
        match.macro
    );

    return ret;
}

/**
 * Returns a set containing all macros in the document.
 *
 * @export
 * @param {Ast.Ast} ast
 * @returns {Map<string, Ast.Macro>}
 */
export function allEnvironments(ast: Ast.Ast): Map<string, Ast.Environment[]> {
    const ret: Map<string, Ast.Environment[]> = new Map();
    walkAst(
        ast,
        (node) => {
            const name = printRaw(node.env);
            let newVal = ret.get(name) || [];
            newVal.push(node);
            ret.set(name, newVal);
            return node;
        },
        match.environment
    );

    return ret;
}

type IncludedPackage = {
    name: string;
    args?: Ast.Argument;
};

/**
 * Get a list of all packages directly imported into the file. This can
 * be done with `usepackage` or `RequirePackage`. Packages are returned
 * in order with the exception that all `RequirePackage` imports are before
 * all `usepackage` imports.
 * 
 * Duplicates may appear if a package has been imported multiple times.
 *
 */
export function getIncludedPackages(ast: Ast.Ast): IncludedPackage[] {
    const macros = allMacros(ast);
    const includePackage = macros.get("usepackage") || [];
    const requirePackage = macros.get("RequirePackage") || [];

    const ret: IncludedPackage[] = [];
    function addPackageIfNeeded(pack: Ast.Macro) {
        if (!pack.args) {
            return;
        }
        // The includes are always the last arg
        const includeArgs = pack.args[pack.args.length - 1];
        const optionalArgs =
            pack.args.length > 1
                ? pack.args.find((arg) => arg.openMark === "[")
                : null;
        for (const includeItem of parsePgfkeys(includeArgs.content)) {
            if (!includeItem.itemParts || includeItem.itemParts.length === 0) {
                // They included two commas without an import...
                continue;
            }
            const included: IncludedPackage = {
                name: printRaw(includeItem.itemParts[0]),
            };
            if (optionalArgs) {
                included.args = optionalArgs;
            }
            ret.push(included);
        }
    }
    requirePackage.forEach(addPackageIfNeeded);
    includePackage.forEach(addPackageIfNeeded);

    return ret;
}

export { parsePgfkeys };
